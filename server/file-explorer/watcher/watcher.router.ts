import { Router } from 'express';
import { watcherController } from './watcher.controller.ts';

const router = Router();

router.get('/sse/files',          (req, res) => watcherController.sseFiles(req, res));
router.post('/watcher/broadcast', (req, res) => watcherController.broadcastChange(req, res));
router.get('/watcher/snapshot',   (req, res) => watcherController.getSnapshot(req, res));
router.get('/watcher/clients',    (req, res) => watcherController.getClientCount(req, res));
router.get('/watcher/health',     (req, res) => watcherController.healthCheck(req, res));

export default router;
