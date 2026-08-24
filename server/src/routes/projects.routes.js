import { Router } from 'express';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '../services/projectService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/projects
 * Success: 200 { data: Project[] } — each includes client summary + nested
 *          quotes[] and invoices[] summaries. Status exposed as both `stage`
 *          (frontend naming) and `status` (schema naming).
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listProjects(req.user.id) });
  })
);

/**
 * POST /api/projects
 * Body:    { clientId (required), title (required), status|stage?, quotedAmount?,
 *            hoursLogged?, notes?, startDate?, deadline? }
 * Dates:   'YYYY-MM-DD' or full ISO strings.
 * Success: 201 { data: Project }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await createProject(req.user.id, req.body ?? {}) });
  })
);

/** GET /api/projects/:id → 200 { data: Project } | 404 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await getProject(req.user.id, req.params.id) });
  })
);

/** PUT /api/projects/:id — partial update → 200 { data: Project } | 404 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await updateProject(req.user.id, req.params.id, req.body ?? {}) });
  })
);

/** DELETE /api/projects/:id — cascades quotes/invoices → 200 { data: { success: true } } | 404 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await deleteProject(req.user.id, req.params.id) });
  })
);

export default router;
