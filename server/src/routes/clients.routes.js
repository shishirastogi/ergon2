import { Router } from 'express';
import {
  listClients,
  createClient,
  getClient,
  updateClient,
  deleteClient,
} from '../services/clientService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// All routes below require a valid JWT.
const router = Router();
router.use(requireAuth);

/**
 * GET /api/clients
 * Success: 200 { data: Client[] } — each client includes `projects[]` plus
 *          computed totalBilled / outstandingBalance.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listClients(req.user.id) });
  })
);

/**
 * POST /api/clients
 * Body:    { name (required), company?, email?, phone?, notes?, status? LEAD|ACTIVE|PAST }
 * Success: 201 { data: Client }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createClient(req.user.id, req.body ?? {}) });
  })
);

/** GET /api/clients/:id → 200 { data: Client } | 404 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getClient(req.user.id, req.params.id) });
  })
);

/**
 * PUT /api/clients/:id
 * Body: any subset of the create fields
 * Success: 200 { data: Client } | 404
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateClient(req.user.id, req.params.id, req.body ?? {}) });
  })
);

/**
 * DELETE /api/clients/:id
 * Blocked with 409 if the client has PAID invoices; otherwise cascades.
 * Success: 200 { data: { success: true } } | 404 | 409
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await deleteClient(req.user.id, req.params.id) });
  })
);

export default router;
