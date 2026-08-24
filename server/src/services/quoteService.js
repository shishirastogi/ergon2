import prismaPkg from '@prisma/client';
const { Prisma } = prismaPkg;
import { prisma } from '../db.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { computeTotals } from '../utils/money.js';
import {
  lineItemsInput,
  oneOf,
  optionalDate,
  optionalString,
} from '../utils/validate.js';
import { serializeInvoice, serializeQuote } from '../serializers/index.js';

/**
 * Quote service.
 *
 * CORE RULE (spec §4): totals are computed HERE, server-side, from line items
 * × quantity + tax rate — never trusted from the client. The client may send
 * a `total` field; it is ignored entirely.
 */

const QUOTE_INCLUDE = {
  project: { include: { client: true } },
  lineItems: { orderBy: { position: 'asc' } },
  invoice: true,
};

/** Sequential human-friendly numbers: QUO-2026-001, scoped per calendar year. */
async function nextQuoteNumber(db) {
  const year = new Date().getUTCFullYear();
  const count = await db.quote.count({
    where: { createdAt: { gte: new Date(Date.UTC(year, 0, 1)) } },
  });
  let seq = count + 1;
  // Defensive loop against collisions after deletes.
  for (;;) {
    const candidate = `QUO-${year}-${String(seq).padStart(3, '0')}`;
    const exists = await db.quote.findUnique({ where: { quoteNumber: candidate } });
    if (!exists) return candidate;
    seq += 1;
  }
}

function validateQuoteInput(body) {
  const items = lineItemsInput(body.lineItems);
  if (items.length === 0) throw badRequest('At least one line item is required');

  // taxRate: fraction of 1 (0.18 = 18%), matching the frontend contract.
  let taxRate = 0;
  if (body.taxRate !== undefined && body.taxRate !== null && body.taxRate !== '') {
    const n = Number(body.taxRate);
    if (!Number.isFinite(n)) throw badRequest("'taxRate' must be a number");
    if (n > 1) {
      // Frontend seeds use fractions; if someone sends 18 they almost certainly mean 18%.
      if (n >= 1 && n <= 100) throw badRequest("'taxRate' must be a fraction of 1 (e.g. 0.18 for 18%), not a percentage");
      throw badRequest("'taxRate' must be between 0 and 1");
    }
    taxRate = n;
  }

  const status = oneOf(body.status, 'status', ['DRAFT', 'SENT']) ?? 'DRAFT';

  return {
    lineItems: items,
    taxRate,
    status,
    notes: optionalString(body.notes, 'notes', { max: 5000 }),
    validUntil: optionalDate(body.validUntil, 'validUntil'),
  };
}

export async function listQuotes(userId) {
  const quotes = await prisma.quote.findMany({
    where: { project: { client: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: QUOTE_INCLUDE,
  });
  return quotes.map((q) => serializeQuote(q, { includeProject: true }));
}

export async function createQuote(userId, body) {
  if (!body.projectId || typeof body.projectId !== 'string') {
    throw badRequest("'projectId' is required");
  }

  const project = await prisma.project.findFirst({
    where: { id: body.projectId, client: { userId } },
    include: { client: true },
  });
  if (!project) throw notFound('Project not found');

  const input = validateQuoteInput(body);

  // Server-side total computation — the ONLY source of truth for money math.
  const totals = computeTotals(input.lineItems, input.taxRate);
  // NOTE: no interactive $transaction here — Prisma interactive transactions
  // are unreliable through transaction-mode connection poolers (Neon pooler /
  // PgBouncer → P2028). The single create below is atomic (nested writes).
  const quoteNumber = await nextQuoteNumber(prisma);
  const quote = await prisma.quote.create({
    data: {
      projectId: project.id,
      clientId: project.clientId, // derived from the project, never from the body
      quoteNumber,
      taxRate: input.taxRate,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      status: input.status,
      notes: input.notes,
      validUntil: input.validUntil,
      lineItems: {
        create: input.lineItems.map((li, i) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          position: i,
        })),
      },
    },
    include: QUOTE_INCLUDE,
  });

  return serializeQuote(quote, { includeProject: true });
}

async function getOwnedQuoteOrThrow(userId, quoteId) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, project: { client: { userId } } },
    include: QUOTE_INCLUDE,
  });
  if (!quote) throw notFound('Quote not found');
  return quote;
}

export async function getQuote(userId, quoteId) {
  const quote = await getOwnedQuoteOrThrow(userId, quoteId);
  return serializeQuote(quote, { includeProject: true });
}

/**
 * Edit a quote (QuoteEditor "save changes" flow). Rules:
 *  - BLOCKED once converted (historical invoices must stay immutable — the
 *    conversion already duplicated line items, so this is belt-and-braces)
 *  - if lineItems/taxRate provided, totals are RECOMPUTED server-side; any
 *    client-sent subtotal/taxAmount/total is ignored
 *  - status may move along DRAFT → SENT → APPROVED / REJECTED
 *  - line items are replaced wholesale when provided (delete + recreate;
 *    safe for single-tenant use, no interactive transactions per pooler)
 */
export async function updateQuote(userId, quoteId, body = {}) {
  const quote = await getOwnedQuoteOrThrow(userId, quoteId);

  if (quote.invoice) {
    throw conflict('Converted quotes can no longer be edited');
  }

  const data = {};

  let items = null;
  if (body.lineItems !== undefined) {
    items = lineItemsInput(body.lineItems);
    if (items.length === 0) throw badRequest('At least one line item is required');
  }

  if (body.taxRate !== undefined && body.taxRate !== null && body.taxRate !== '') {
    const n = Number(body.taxRate);
    if (!Number.isFinite(n)) throw badRequest("'taxRate' must be a number");
    if (n > 1 || n < 0) {
      throw badRequest("'taxRate' must be a fraction of 1 (e.g. 0.18 for 18%)");
    }
    data.taxRate = n;
  }

  if (items !== null || data.taxRate !== undefined) {
    // Recompute from the FULL new picture: new items (or existing ones) × new rate.
    const effectiveItems =
      items ??
      quote.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity.toNumber(),
        unitPrice: li.unitPrice.toNumber(),
      }));
    const rate = data.taxRate !== undefined ? data.taxRate : quote.taxRate.toNumber();
    const totals = computeTotals(effectiveItems, rate);
    data.subtotal = totals.subtotal;
    data.taxAmount = totals.taxAmount;
    data.total = totals.total;
  }

  if (body.status !== undefined) {
    const status = oneOf(body.status, 'status', ['DRAFT', 'SENT', 'APPROVED', 'REJECTED']);
    if (status !== undefined) data.status = status;
  }
  if (body.notes !== undefined) data.notes = optionalString(body.notes, 'notes', { max: 5000 });
  if (body.validUntil !== undefined) {
    data.validUntil = optionalDate(body.validUntil, 'validUntil');
  }

  const updated = await prisma.quote.update({ where: { id: quote.id }, data });

  if (items !== null) {
    await prisma.lineItem.deleteMany({ where: { quoteId: quote.id } });
    await prisma.lineItem.createMany({
      data: items.map((li, i) => ({
        quoteId: quote.id,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        position: i,
      })),
    });
  }

  const fresh = await prisma.quote.findUnique({
    where: { id: quote.id },
    include: QUOTE_INCLUDE,
  });
  return serializeQuote(fresh, { includeProject: true });
}

/**
 * Quote → Invoice conversion (spec §4):
 *  - Line items are COPIED onto the new invoice at conversion time (duplicated
 *    rows), so later edits to the quote can never mutate historical invoices.
 *  - Totals are recomputed server-side from the copied items.
 *  - Source quote is marked APPROVED and invoice.quoteId links back to it.
 *  - dueDate defaults to issueDate + 30 days (Net-30).
 */
export async function convertToInvoice(userId, quoteId, body = {}) {
  const quote = await getOwnedQuoteOrThrow(userId, quoteId);

  if (quote.invoice) {
    throw conflict(`Quote already converted to invoice ${quote.invoice.id}`);
  }
  if (quote.status === 'REJECTED') {
    throw conflict('Rejected quotes cannot be converted to invoices');
  }

  const issueDate = new Date();
  const dueDate = optionalDate(body.dueDate, 'dueDate') ?? new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // NOTE: no interactive $transaction — PgBouncer/Neon pooler breaks them
  // (P2028). Correctness is instead guaranteed by the DB-level UNIQUE
  // constraint on Invoice.quoteId: a concurrent double conversion loses the
  // race with P2002, which we surface as 409.
  const totals = computeTotals(
    quote.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity.toNumber(),
      unitPrice: li.unitPrice.toNumber(),
    })),
    quote.taxRate.toNumber()
  );

  let seq = (await prisma.invoice.count({
    where: { createdAt: { gte: new Date(new Date().getUTCFullYear(), 0, 1) } },
  })) + 1;
  let invoiceNumber;
  for (;;) {
    invoiceNumber = `INV-${new Date().getUTCFullYear()}-${String(seq).padStart(3, '0')}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    if (!exists) break;
    seq += 1;
  }

  let created;
  try {
    created = await prisma.invoice.create({
      data: {
        projectId: quote.projectId,
        quoteId: quote.id,
        clientId: quote.clientId,
        invoiceNumber,
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        taxRate: quote.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        amountPaid: 0,
        status: 'UNPAID',
        notes: quote.notes,
        // DUPLICATE line items onto the invoice (audit/history safety)
        lineItems: {
          create: quote.lineItems.map((li, i) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            position: i,
          })),
        },
      },
      include: {
        project: { include: { client: true } },
        quote: true,
        lineItems: { orderBy: { position: 'asc' } },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('Quote already converted to an invoice');
    }
    throw err;
  }

  // Mark source quote APPROVED only after the invoice exists.
  await prisma.quote.update({ where: { id: quote.id }, data: { status: 'APPROVED' } });

  // Advance the project pipeline if it hasn't progressed past QUOTE_SENT yet.
  if (['LEAD', 'QUOTE_SENT'].includes(quote.project.status)) {
    await prisma.project.update({
      where: { id: quote.projectId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  return serializeInvoice(created);
}
