import { prisma } from '../db.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { computeTotals, D, round2 } from '../utils/money.js';
import {
  lineItemsInput,
  optionalDate,
  optionalString,
  positiveNumber,
} from '../utils/validate.js';
import { serializeInvoice } from '../serializers/index.js';

/**
 * Invoice service.
 *
 * Payment status rules (spec §4):
 *  - mark-paid accepts full (no body / no amount) and partial payments.
 *  - partial payment  → status PARTIAL
 *  - balance settled  → status PAID + paidDate stamped
 *  - past dueDate with remaining balance → OVERDUE, computed on read in the
 *    serializer so list/detail/dashboard are always consistent.
 */

const INVOICE_INCLUDE = {
  project: { include: { client: true } },
  quote: true,
  lineItems: { orderBy: { position: 'asc' } },
};

export async function listInvoices(userId) {
  const invoices = await prisma.invoice.findMany({
    where: { project: { client: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: INVOICE_INCLUDE,
  });
  return invoices.map((i) => serializeInvoice(i));
}

async function getOwnedInvoiceOrThrow(userId, invoiceId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, project: { client: { userId } } },
    include: INVOICE_INCLUDE,
  });
  if (!invoice) throw notFound('Invoice not found');
  return invoice;
}

export async function getInvoice(userId, invoiceId) {
  const invoice = await getOwnedInvoiceOrThrow(userId, invoiceId);
  return serializeInvoice(invoice);
}

/** Sequential INV-YYYY-NNN numbering, collision-safe. */
async function nextInvoiceNumber() {
  let seq =
    (
      await prisma.invoice.count({
        where: { createdAt: { gte: new Date(new Date().getUTCFullYear(), 0, 1) } },
      })
    ) +
    1;
  for (;;) {
    const candidate = `INV-${new Date().getUTCFullYear()}-${String(seq).padStart(3, '0')}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } });
    if (!exists) return candidate;
    seq += 1;
  }
}

/**
 * Ad-hoc invoice creation (ergon-database.md §3 allows invoices created
 * directly against a Project without a source quote — the InvoiceEditor
 * screen uses this).
 *
 * Same server-side money rules as quotes:
 *  - subtotal/taxAmount/total/invoiceNumber/status from the client are IGNORED;
 *    totals are recomputed from lineItems × quantity + taxRate
 *  - payment state derives from amountPaid (clamped to total): fully paid at
 *    creation stamps paidDate; partial ⇒ PARTIAL; else UNPAID (OVERDUE is
 *    still computed on read)
 */
export async function createInvoice(userId, body = {}) {
  if (!body.projectId || typeof body.projectId !== 'string') {
    throw badRequest("'projectId' is required");
  }

  const project = await prisma.project.findFirst({
    where: { id: body.projectId, client: { userId } },
    include: { client: true },
  });
  if (!project) throw notFound('Project not found');

  if (body.clientId && body.clientId !== project.clientId) {
    throw badRequest("'clientId' does not match the selected project's client");
  }

  const items = lineItemsInput(body.lineItems);
  if (items.length === 0) throw badRequest('At least one line item is required');

  // Tax rate fraction of 1, matching quotes (0.18 = 18%).
  let taxRate = 0;
  if (body.taxRate !== undefined && body.taxRate !== null && body.taxRate !== '') {
    const n = Number(body.taxRate);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      throw badRequest("'taxRate' must be a fraction of 1 (e.g. 0.18 for 18%)");
    }
    taxRate = n;
  }

  const totals = computeTotals(items, taxRate);
  const issueDate = optionalDate(body.issueDate, 'issueDate') ?? new Date();
  const dueDate =
    optionalDate(body.dueDate, 'dueDate') ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Optional initial payment; clamped to total like mark-paid.
  let amountPaidD = D(0);
  if (body.amountPaid !== undefined && body.amountPaid !== null && body.amountPaid !== '') {
    amountPaidD = D(positiveNumber(body.amountPaid, 'amountPaid', { allowZero: true }));
    if (amountPaidD.gt(totals.total)) amountPaidD = totals.total;
  }
  const isFullyPaid = round2(totals.total).minus(amountPaidD).lte(0);

  const invoiceNumber = await nextInvoiceNumber();
  const created = await prisma.invoice.create({
    data: {
      projectId: project.id,
      clientId: project.clientId, // derived, never trusted from body
      invoiceNumber,
      issueDate,
      dueDate,
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      amountPaid: round2(amountPaidD),
      status: isFullyPaid ? 'PAID' : amountPaidD.gt(0) ? 'PARTIAL' : 'UNPAID',
      paidDate: isFullyPaid ? new Date() : null,
      notes: optionalString(body.notes, 'notes', { max: 5000 }),
      lineItems: {
        create: items.map((li, i) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          position: i,
        })),
      },
    },
    include: INVOICE_INCLUDE,
  });

  // Advance the pipeline for brand-new projects created inline by the editor.
  if (['LEAD', 'QUOTE_SENT'].includes(project.status)) {
    await prisma.project.update({ where: { id: project.id }, data: { status: 'IN_PROGRESS' } });
  }

  return serializeInvoice(created);
}

/**
 * Records a payment against an invoice.
 * @param {object} body `{ amount?: number }` — omit `amount` to pay in full.
 */
export async function markPaid(userId, invoiceId, body = {}) {
  const invoice = await getOwnedInvoiceOrThrow(userId, invoiceId);

  const totalD = D(invoice.total);
  const paidSoFar = D(invoice.amountPaid);
  let remaining = round2(totalD.minus(paidSoFar));

  if (remaining.lte(0)) {
    throw badRequest('Invoice is already fully paid');
  }

  // No amount (or null/undefined) ⇒ pay the remaining balance in full.
  let paymentAmount =
    body.amount === undefined || body.amount === null ? remaining.toNumber() : positiveNumber(body.amount, 'amount');

  let amount = D(paymentAmount);
  if (amount.gt(remaining)) {
    // Clamp overpayment instead of rejecting — matches real-world rounding
    // generosity; the recorded payment never exceeds the invoice total.
    amount = remaining;
  }

  const newPaid = round2(paidSoFar.plus(amount));
  const newRemaining = round2(totalD.minus(newPaid));
  const isFullyPaid = newRemaining.lte(0);

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: newPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIAL',
      paidDate: isFullyPaid ? new Date() : invoice.paidDate,

      // Keep the project pipeline honest: once an invoice is fully paid the
      // project is at least DELIVERED (PAID only when nothing else outstanding).
      ...(isFullyPaid
        ? {
            project: {
              update: {
                status:
                  ['DELIVERED', 'REVISIONS', 'IN_PROGRESS', 'QUOTE_SENT', 'LEAD'].includes(
                    invoice.project.status
                  )
                    ? 'DELIVERED'
                    : undefined,
              },
            },
          }
        : {}),
    },
    include: INVOICE_INCLUDE,
  });

  return serializeInvoice(updated);
}
