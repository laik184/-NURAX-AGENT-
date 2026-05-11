import { Router } from 'express';
import { historyController } from './history.controller.ts';

const router = Router();

router.get('/file-history/:projectId/:filePath(*)',    (req, res) => historyController.getHistory(req, res));
router.post('/file-history/snapshot',                  (req, res) => historyController.snapshot(req, res));
router.get('/file-history/diff',                       (req, res) => historyController.getDiff(req, res));
router.post('/file-history/restore/:versionId',        (req, res) => historyController.restoreVersion(req, res));
router.delete('/file-history/:projectId/:filePath(*)', (req, res) => historyController.clearHistory(req, res));
router.get('/file-history/stats',                      (req, res) => historyController.getStats(req, res));
router.get('/history/health',                          (req, res) => historyController.healthCheck(req, res));

export default router;
