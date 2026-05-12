/**
 * IQ 2000 — Console · Persist Router
 *
 * Routes:
 *   POST /api/console/logs  → Manually inject a log line
 */

import { Router } from 'express';
import { persistController } from './persist.controller.ts';

const router = Router();

router.post('/console/logs', persistController.injectLine.bind(persistController));

export default router;
