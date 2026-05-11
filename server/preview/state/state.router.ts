import { Router } from 'express';
import { stateController } from './state.controller.ts';

const router = Router();

router.get('/preview-state', (req, res) => stateController.getState(req, res));
router.post('/preview-state', (req, res) => stateController.updateState(req, res));
router.delete('/preview-state', (req, res) => stateController.resetState(req, res));

router.patch('/preview-state/url', (req, res) => stateController.setUrl(req, res));
router.patch('/preview-state/device', (req, res) => stateController.setDevice(req, res));
router.patch('/preview-state/grid', (req, res) => stateController.setGridMode(req, res));

router.get('/preview-state/snapshot', (req, res) => stateController.snapshot(req, res));
router.get('/state/health', (req, res) => stateController.healthCheck(req, res));

export default router;
