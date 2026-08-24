import { Router } from 'express';
import { getProfitability } from '../services/dashboardService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/dashboard/profitability?from=YYYY-MM-DD&to=YYYY-MM-DD   (range optional)
 *
 * Response shape is documented in full inside services/dashboardService.js —
 * it is the stability contract the frontend dashboard depends on. Keep it in
 * sync with src/types/index.ts → ProfitabilityDashboard when it evolves.
 */
router.get(
  '/profitability',
  asyncHandler(async (req, res) => {
    res.json({ data: await getProfitability(req.user.id, req.query) });
  })
);

export default router;
