import { Router } from 'express';
import { tunnelController } from './tunnel.controller.ts';

const router = Router();

router.get('/tunnel-info', (req, res) => tunnelController.getTunnelInfo(req, res));
router.get('/tunnel/ports', (req, res) => tunnelController.listPorts(req, res));
router.post('/tunnel/ports', (req, res) => tunnelController.addPort(req, res));
router.delete('/tunnel/ports/:id', (req, res) => tunnelController.removePort(req, res));
router.get('/tunnel/public-url', (req, res) => tunnelController.getPublicUrl(req, res));
router.get('/tunnel/health', (req, res) => tunnelController.healthCheck(req, res));

export default router;
