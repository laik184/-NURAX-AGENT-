import { Router } from 'express';
import { runtimeController } from './runtime.controller.ts';

const router = Router();

router.post('/run-project', (req, res) => runtimeController.runProject(req, res));
router.post('/stop-project', (req, res) => runtimeController.stopProject(req, res));
router.post('/restart', (req, res) => runtimeController.restartProject(req, res));
router.get('/project-status', (req, res) => runtimeController.getStatus(req, res));
router.get('/project-status/:id', (req, res) => runtimeController.getProcess(req, res));
router.get('/runtime/health', (req, res) => runtimeController.healthCheck(req, res));

export default router;
