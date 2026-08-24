import { num } from '../utils/money.js';

/**
 * Serializers: DB model → API JSON shape.
 *
 * These exist to keep ONE stable API contract (matching src/types/index.ts on
 * the frontend) regardless of how the Prisma schema evolves. Key mappings:
 *   - Project.status  → exposed as `stage` AND `status` (frontend uses `stage`)
 *   - LineItem.unitPrice → exposed as `unitRate`
 *   - Invoice.paidDate → exposed as `paidAt`
 *   - Decimals        → plain numbers
 */

export const iso = (d) => (d ? new Date(d).toISOString() : null);

/** 'YYYY-MM-DD' for date-only fields the frontend renders as plain dates; '' when absent. */
const dateOnly = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  // If stored with time semantics, still emit date-only per frontend contract.
  return dt.toISOString().slice(0, 10);
};

export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    studioName: user.studioName ?? '',
  };
}

export function serializeLineItem(li) {
  const quantity = num(li.quantity);
  const unitRate = num(li.unitPrice);
  return {
    id: li.id,
    description: li.description,
    quantity,
    unitRate,
    total: num(li.unitPrice.times(li.quantity).toDecimalPlaces(2)),
  };
}

function serializeQuoteCore(quote) {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    projectId: quote.projectId,
    clientId: quote.clientId,
    status: quote.status,
    lineItems: (quote.lineItems || []).map(serializeLineItem),
    subtotal: num(quote.subtotal),
    taxRate: num(quote.taxRate),
    taxAmount: num(quote.taxAmount),
    total: num(quote.total),
    notes: quote.notes ?? '',
    validUntil: dateOnly(quote.validUntil),
    invoiceId: quote.invoice ? quote.invoice.id : undefined,
    createdAt: iso(quote.createdAt),
    updatedAt: iso(quote.updatedAt),
  };
}

export function serializeQuote(quote, { includeProject = false } = {}) {
  const base = serializeQuoteCore(quote);
  if (includeProject && quote.project) {
    base.project = quote.project.client
      ? serializeProjectLite(quote.project.client, quote.project)
      : serializeProjectLite(quote.project);
    base.client = quote.project.client
      ? {
          id: quote.project.client.id,
          name: quote.project.client.name,
          company: quote.project.client.company ?? '',
          status: quote.project.client.status,
        }
      : null;
  }
  return base;
}

/** Lightweight project summary used inside nested responses. */
export function serializeProjectLite(projectOrClient, project) {
  if (project) {
    // called as (client, project)
    return {
      id: project.id,
      title: project.title,
      stage: project.status,
      status: project.status,
      quotedAmount: num(project.quotedAmount),
    };
  }
  const p = projectOrClient;
  return {
    id: p.id,
    title: p.title,
    stage: p.status,
    status: p.status,
    quotedAmount: num(p.quotedAmount),
  };
}

/**
 * Invoice status is computed consistently on READ:
 *   PAID wins; then OVERDUE (past due + balance remaining); else stored value.
 * The same rule is applied in list, detail and dashboard aggregations.
 */
export function computeInvoiceStatus(invoice) {
  if (invoice.status === 'PAID') return 'PAID';
  const remaining = num(invoice.total) - num(invoice.amountPaid);
  if (
    invoice.dueDate &&
    new Date(invoice.dueDate).getTime() < Date.now() &&
    remaining > 0
  ) {
    return 'OVERDUE';
  }
  return invoice.status;
}

export function serializeInvoice(invoice, { includeRefs = true } = {}) {
  const out = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    projectId: invoice.projectId,
    clientId: invoice.clientId,
    quoteId: invoice.quoteId ?? undefined,
    status: computeInvoiceStatus(invoice),
    issueDate: dateOnly(invoice.issueDate),
    dueDate: dateOnly(invoice.dueDate),
    lineItems: (invoice.lineItems || []).map(serializeLineItem),
    subtotal: num(invoice.subtotal),
    taxRate: num(invoice.taxRate),
    taxAmount: num(invoice.taxAmount),
    total: num(invoice.total),
    amountPaid: num(invoice.amountPaid),
    remainingBalance: Math.round((num(invoice.total) - num(invoice.amountPaid)) * 100) / 100,
    notes: invoice.notes ?? '',
    createdAt: iso(invoice.createdAt),
    updatedAt: iso(invoice.updatedAt),
  };
  if (invoice.paidDate) out.paidAt = iso(invoice.paidDate);

  if (includeRefs) {
    if (invoice.quote) {
      out.quote = { id: invoice.quote.id, quoteNumber: invoice.quote.quoteNumber };
    }
    if (invoice.project) {
      out.project = {
        id: invoice.project.id,
        title: invoice.project.title,
        stage: invoice.project.status,
      };
    }
    if (invoice.project?.client) {
      out.client = {
        id: invoice.project.client.id,
        name: invoice.project.client.name,
        company: invoice.project.client.company ?? '',
      };
    }
  }
  return out;
}

export function serializeProject(project, { includeClient = true } = {}) {
  const out = {
    id: project.id,
    title: project.title,
    clientId: project.clientId,
    client:
      includeClient && project.client
        ? {
            id: project.client.id,
            name: project.client.name,
            company: project.client.company ?? '',
            status: project.client.status,
          }
        : undefined,
    // Frontend reads `stage`; we also expose `status` (DB/spec naming) for clarity.
    stage: project.status,
    status: project.status,
    quotedAmount: num(project.quotedAmount),
    hoursLogged: num(project.hoursLogged),
    notes: project.notes ?? '',
    startDate: dateOnly(project.startDate),
    deadline: dateOnly(project.deadline),
    createdAt: iso(project.createdAt),
    updatedAt: iso(project.updatedAt),
    quotes: project.quotes ? project.quotes.map((q) => serializeQuote(q)) : undefined,
    invoices: project.invoices ? project.invoices.map((i) => serializeInvoice(i, { includeRefs: false })) : undefined,
  };
  // Drop undefined optional arrays so payloads stay clean.
  if (!project.quotes) delete out.quotes;
  if (!project.invoices) delete out.invoices;
  return out;
}

/**
 * Client serialization. Financial aggregates are computed from invoices at
 * read time (never stored stale):
 *   totalBilled       = Σ invoice.total over ALL issued invoices
 *   outstandingBalance= Σ max(0, total − amountPaid) over not-fully-paid invoices
 */
export function serializeClient(client, { includeProjects = false } = {}) {
  let totalBilled = 0;
  let outstandingBalance = 0;
  if (client.projects) {
    for (const p of client.projects) {
      for (const inv of p.invoices || []) {
        const total = num(inv.total);
        const paid = num(inv.amountPaid);
        totalBilled += total;
        const remaining = Math.round((total - paid) * 100) / 100;
        if (remaining > 0 && inv.status !== 'PAID') outstandingBalance += remaining;
      }
    }
    outstandingBalance = Math.round(outstandingBalance * 100) / 100;
    totalBilled = Math.round(totalBilled * 100) / 100;
  }

  const out = {
    id: client.id,
    name: client.name,
    company: client.company ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    notes: client.notes ?? '',
    status: client.status,
    totalBilled,
    outstandingBalance,
    createdAt: iso(client.createdAt),
    updatedAt: iso(client.updatedAt),
  };

  if (includeProjects && client.projects) {
    out.projects = client.projects.map((p) => ({
      ...serializeProject({ ...p, client }, { includeClient: false }),
      quotes: undefined,
      invoices: undefined,
    }));
  }
  return out;
}
