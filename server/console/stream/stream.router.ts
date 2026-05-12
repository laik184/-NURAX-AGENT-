/**
 * IQ 2000 — Console · Stream Router
 *
 * Routes:
 *   GET /api/console/stream          → SSE subscription
 *   GET /api/console/stream/snapshot → Active client metadata
 */

import { Router } from 'express';
import { streamController } from './stream.controller.ts';

const router = Router();

router.get('/console/stream', streamController.subscribe.bind(streamController));
router.get('/console/stream/snapshot', streamController.snapshot.bind(streamController));

export default router;
