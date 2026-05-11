import { Router } from 'express';
import { devtoolsController } from './devtools.controller.ts';

const router = Router();

router.get('/sse/console', (req, res) => devtoolsController.sseConsole(req, res));
router.get('/sse/preview', (req, res) => devtoolsController.ssePreview(req, res));
router.get('/__sse_reload', (req, res) => devtoolsController.sseReload(req, res));

router.post('/devtools/log', (req, res) => devtoolsController.pushLog(req, res));
router.post('/devtools/reload', (req, res) => devtoolsController.broadcastReload(req, res));
router.delete('/devtools/logs', (req, res) => devtoolsController.clearLogs(req, res));
router.get('/devtools/snapshot', (req, res) => devtoolsController.getSnapshot(req, res));
router.get('/devtools/health', (req, res) => devtoolsController.healthCheck(req, res));

export default router;
