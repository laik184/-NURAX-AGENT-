import { Router } from 'express';
import { treeController } from './tree.controller.ts';

const router = Router();

router.get('/list-files',    (req, res) => treeController.listFiles(req, res));
router.get('/flatten-files', (req, res) => treeController.flattenFiles(req, res));
router.get('/file-exists',   (req, res) => treeController.checkExists(req, res));
router.get('/tree/health',   (req, res) => treeController.healthCheck(req, res));

export default router;
