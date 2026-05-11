import { Router } from 'express';
import { searchController } from './search.controller.ts';

const router = Router();

router.get('/search-files',          (req, res) => searchController.searchFiles(req, res));
router.delete('/search-index',       (req, res) => searchController.invalidateIndex(req, res));
router.get('/search/health',         (req, res) => searchController.healthCheck(req, res));

export default router;
