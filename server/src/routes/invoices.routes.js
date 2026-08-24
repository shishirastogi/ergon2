import { Router } from 'express';
import { listInvoices, getInvoice, markPaid, createInvoice } from '../services/invoiceService.js';
import { renderInvoicePdf } from '../services/pdfService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

/**
 * POST /api/invoices — ad-hoc invoice creation (no source quote needed).
 * Body:    { projectId (required), lineItems:[{description,quantity,unitRate}] (≥1),
 *            taxRate?, issueDate?, dueDate?, amountPaid?, notes? }
 * Any client-sent subtotal/taxAmount/total/invoiceNumber/status is IGNORED —
 * totals are recomputed server-side and payment state derives from amountPaid.
 * Success: 201 { data: Invoice }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createInvoice(req.user.id, req.body ?? {}) });
  })
);

/**
 * GET /api/invoices
 * Success: 200 { data: Invoice[] } — status is computed on read (OVERDUE
 *          applied when past dueDate with remaining balance).
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listInvoices(req.user.id) });
  })
);

/** GET /api/invoices/:id â†’ 200 { data: Invoice } | 404 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getInvoice(req.user.id, req.params.id) });
  })
);

/**
 * GET /api/invoices/:id/pdf
 * Success: 200 binary application/pdf (Content-Disposition attachment)
 * All dynamic text is sanitized before rendering (see pdfService).
 */
router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const buffer = await renderInvoicePdf(req.user.id, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    // Financial document — never cached by shared proxies/browsers.
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  })
);

/**
 * POST /api/invoices/:id/mark-paid
 * Body:    { amount? } â€” omit for FULL payment; a partial amount sets status PARTIAL.
 * Success: 200 { data: Invoice }
 * Errors:  404 | 400 (already fully paid / invalid amount)
 */
router.post(
  '/:id/mark-paid',
  asyncHandler(async (req, res) => {
    res.json({ data: await markPaid(req.user.id, req.params.id, req.body ?? {}) });
  })
);

export default router;
