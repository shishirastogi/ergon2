import { Router } from 'express';
import {
  listQuotes,
  createQuote,
  getQuote,
  updateQuote,
  convertToInvoice,
} from '../services/quoteService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/quotes
 * Success: 200 { data: Quote[] } — each includes project + client summaries,
 *          server-computed subtotal/taxAmount/total, lineItems with unitRate.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listQuotes(req.user.id) });
  })
);

/**
 * POST /api/quotes
 * Body:    { projectId (required), lineItems: [{ description, quantity, unitRate }] (≥1),
 *            taxRate? (fraction of 1, e.g. 0.18 = 18%), status? DRAFT|SENT,
 *            notes?, validUntil? }
 *
 * Any `total`/`subtotal` sent by the client is IGNORED — totals are always
 * recomputed server-side from line items × quantity + tax rate.
 *
 * Success: 201 { data: Quote }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createQuote(req.user.id, req.body ?? {}) });
  })
);

/** GET /api/quotes/:id → 200 { data: Quote } | 404 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getQuote(req.user.id, req.params.id) });
  })
);

/**
 * PUT /api/quotes/:id — edit a quote (QuoteEditor save).
 * Body:    any subset of { lineItems, taxRate, status DRAFT|SENT|APPROVED|REJECTED,
 *          notes, validUntil }
 * Totals recomputed server-side whenever lineItems/taxRate change; converted
 * quotes are locked (409).
 * Success: 200 { data: Quote } | 404 | 409
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateQuote(req.user.id, req.params.id, req.body ?? {}) });
  })
);

/**
 * POST /api/quotes/:id/convert-to-invoice
 * Copies line items onto a NEW invoice (duplicated rows), recomputes totals
 * server-side, marks this quote APPROVED, links invoice.quoteId back here.
 * Body:    { dueDate? } (optional override; defaults Net-30)
 * Success: 201 { data: Invoice } | 404 | 409 (already converted / rejected)
 */
router.post(
  '/:id/convert-to-invoice',
  asyncHandler(async (req, res) => {
    res.status(201).json({
      data: await convertToInvoice(req.user.id, req.params.id, req.body ?? {}),
    });
  })
);

export default router;
