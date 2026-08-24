import pdfLibPkg from 'pdf-lib';
const { PDFDocument, StandardFonts, rgb } = pdfLibPkg;
import { prisma } from '../db.js';
import { notFound } from '../utils/httpError.js';
import { sanitizeMultiline, sanitizePdfText } from '../utils/sanitize.js';
import { num } from '../utils/money.js';
import { computeInvoiceStatus } from '../serializers/index.js';

/**
 * Invoice PDF generation with pdf-lib.
 * Every dynamic string passes through sanitizePdfText() BEFORE reaching the
 * renderer — user-entered content can never inject operators/escapes into the
 * document stream, and non-WinAnsi characters can't crash drawing.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.45, 0.47, 0.52);
const ACCENT = rgb(0.23, 0.44, 0.88);

const money = (n) =>
  `Rs ${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function renderInvoicePdf(userId, invoiceId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, project: { client: { userId } } },
    include: {
      project: { include: { client: true } },
      lineItems: { orderBy: { position: 'asc' } },
    },
  });
  if (!invoice) throw notFound('Invoice not found');

  const owner = await prisma.user.findUnique({ where: { id: userId } });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.width, A4.height]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const text = (str, x, y, { size = 10, f = font, color = INK } = {}) =>
    page.drawText(sanitizePdfText(str, { maxLength: 500 }), { x, y, size, font: f, color });

  const right = (str, xRight, y, opts = {}) => {
    const size = opts.size || 10;
    const clean = sanitizePdfText(str, { maxLength: 500 });
    const width = (opts.f || font).widthOfTextAtSize(clean, size);
    return page.drawText(clean, { x: xRight - width, y, size, font: opts.f || font, color: opts.color || INK });
  };

  let y = A4.height - MARGIN;

  // ── Header ────────────────────────────────────────────────────────────────
  text(sanitizePdfText(owner?.studioName || owner?.name || 'Studio', { maxLength: 120 }), MARGIN, y - 14, { size: 16, f: bold });
  right(`INVOICE ${invoice.invoiceNumber}`, A4.width - MARGIN, y - 14, { size: 16, f: bold });
  y -= 34;

  const client = invoice.project?.client;
  text('BILLED TO', MARGIN, y, { size: 8, f: bold, color: MUTED });
  right(
    `STATUS: ${computeInvoiceStatus(invoice)}`,
    A4.width - MARGIN,
    y,
    { size: 8, f: bold, color: MUTED }
  );
  y -= 14;
  text(client?.name || '-', MARGIN, y, { size: 11, f: bold });
  if (client?.company) {
    y -= 13;
    text(client.company, MARGIN, y, { size: 9 });
  }
  if (client?.email) {
    y -= 12;
    text(client.email, MARGIN, y, { size: 9, color: MUTED });
  }
  y -= 22;

  // Issue/due dates on the right column
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  right(`Issue date: ${fmtDate(invoice.issueDate)}`, A4.width - MARGIN, y + 20, { size: 9, color: MUTED });
  right(`Due date: ${fmtDate(invoice.dueDate)}`, A4.width - MARGIN, y + 6, { size: 9, color: MUTED });

  // ── Line items table ──────────────────────────────────────────────────────
  y -= 18;
  const colDesc = MARGIN;
  const colQty = A4.width - MARGIN - 240;
  const colRate = A4.width - MARGIN - 140;
  const colAmt = A4.width - MARGIN;
  page.drawRectangle({ x: MARGIN, y: y - 4, width: A4.width - MARGIN * 2, height: 18, color: rgb(0.96, 0.97, 0.99) });
  text('DESCRIPTION', colDesc, y, { size: 8, f: bold, color: MUTED });
  text('QTY', colQty, y, { size: 8, f: bold, color: MUTED });
  text('RATE', colRate, y, { size: 8, f: bold, color: MUTED });
  text('AMOUNT', colAmt - 60, y, { size: 8, f: bold, color: MUTED });
  y -= 24;

  for (const li of invoice.lineItems) {
    const desc = sanitizePdfText(li.description, { maxLength: 70 });
    text(desc, colDesc, y, { size: 9 });
    text(String(num(li.quantity)), colQty, y, { size: 9 });
    text(money(num(li.unitPrice)), colRate, y, { size: 9 });
    right(money(num(li.unitPrice.times(li.quantity))), colAmt, y, { size: 9 });
    y -= 16;
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  y -= 8;
  page.drawLine({
    start: { x: colQty - 20, y: y + 10 },
    end: { x: A4.width - MARGIN, y: y + 10 },
    thickness: 0.75,
    color: rgb(0.85, 0.86, 0.9),
  });
  right('Subtotal', colRate + 40, y, { size: 9, color: MUTED });
  right(money(num(invoice.subtotal)), A4.width - MARGIN, y, { size: 9 });
  y -= 15;

  const taxPct = num(invoice.taxRate) * 100;
  right(`Tax (${taxPct}%)`, colRate + 40, y, { size: 9, color: MUTED });
  right(money(num(invoice.taxAmount)), A4.width - MARGIN, y, { size: 9 });
  y -= 15;

  right('Total', colRate + 40, y, { size: 9, color: MUTED });
  right(money(num(invoice.total)), A4.width - MARGIN, y, { size: 9, f: bold });
  y -= 15;

  const paid = num(invoice.amountPaid);
  if (paid > 0) {
    right('Amount paid', colRate + 40, y, { size: 9, color: MUTED });
    right(`- ${money(paid)}`, A4.width - MARGIN, y, { size: 9 });
    y -= 15;
  }

  const balance = Math.round((num(invoice.total) - paid) * 100) / 100;
  page.drawRectangle({
    x: colRate + 30,
    y: y - 5,
    width: A4.width - MARGIN - (colRate + 30),
    height: 20,
    color: rgb(0.93, 0.96, 1),
  });
  right('BALANCE DUE', colRate + 45, y, { size: 9, f: bold, color: ACCENT });
  right(money(balance), A4.width - MARGIN, y, { size: 10, f: bold, color: ACCENT });
  y -= 34;

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    const noteLines = sanitizeMultiline(invoice.notes, { maxLines: 5, maxLineLength: 105 });
    if (noteLines.length > 0) {
      text('NOTES', MARGIN, y, { size: 8, f: bold, color: MUTED });
      y -= 13;
      for (const line of noteLines) {
        text(line, MARGIN, y, { size: 9 });
        y -= 13;
      }
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 24 },
    end: { x: A4.width - MARGIN, y: MARGIN + 24 },
    thickness: 0.5,
    color: rgb(0.88, 0.89, 0.92),
  });
  text(
    `${sanitizePdfText(owner?.studioName || 'Ergon Studio', { maxLength: 80 })} · Generated by Ergon`,
    MARGIN,
    MARGIN + 10,
    { size: 8, color: MUTED }
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
