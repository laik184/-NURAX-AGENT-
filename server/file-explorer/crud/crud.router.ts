import { Router } from 'express';
import { crudController } from './crud.controller.ts';

const router = Router();

router.get('/read-file',      (req, res) => crudController.readFile(req, res));
router.post('/save-file',     (req, res) => crudController.saveFile(req, res));
router.post('/rename-file',   (req, res) => crudController.renameFile(req, res));
router.post('/delete-file',   (req, res) => crudController.deleteFile(req, res));
router.post('/create-folder', (req, res) => crudController.createFolder(req, res));
router.get('/crud/health',    (req, res) => crudController.healthCheck(req, res));

export default router;
