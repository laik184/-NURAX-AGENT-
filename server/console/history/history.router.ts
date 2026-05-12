/**
 * IQ 2000 — Console · History Router
 *
 * Routes:
 *   GET    /api/console/history  → Paginated log history
 *   DELETE /api/console/history  → Clear logs for a project
 */

import { Router } from 'express';
import { historyController } from './history.controller.ts';

const router = Router();

router.get('/console/history',    historyController.getHistory.bind(historyController));
router.delete('/console/history', historyController.clearHistory.bind(historyController));

export default router;
