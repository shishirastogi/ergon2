import { Router } from 'express';
import {
  listStudios,
  getStudio,
  createStudio,
  updateStudio,
  deleteStudio,
} from '../services/studioService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

/**
 * Studio profiles — the issuer identity shown on quotes/invoices.
 * Max 5 per user (matches the frontend StudioContext limit).
 *
 * GET    /api/studios        → { data: Studio[] }
 * POST   /api/studios        { name (required), tagline?, email?, phone?,
 *                              website?, address?, logoUrl?, currency? (ISO-4217),
 *                              taxId? }              → 201 { data: Studio }
 * GET    /api/studios/:id    → 200 | 404
 * PUT    /api/studios/:id    partial body           → 200 | 404
 * DELETE /api/studios/:id    → 200 { data: { success: true } }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listStudios(req.user.id) });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createStudio(req.user.id, req.body ?? {}) });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getStudio(req.user.id, req.params.id) });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateStudio(req.user.id, req.params.id, req.body ?? {}) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await deleteStudio(req.user.id, req.params.id) });
  })
);

export default router;
