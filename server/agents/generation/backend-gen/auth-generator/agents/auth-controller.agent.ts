import type { AuthStrategy, GeneratedFile } from '../types.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateAuthController = (strategy: AuthStrategy): GeneratedFile[] => [
  createGeneratedFile(
    'generated/auth/controller/auth.controller.ts',
    `
import { Router } from 'express';

export const createAuthRouter = () => {
  const router = Router();

  router.post('/register', async (_req, res) => {
    return res.status(201).json({ strategy: '${strategy}', action: 'register' });
  });

  router.post('/login', async (_req, res) => {
    return res.status(200).json({ strategy: '${strategy}', action: 'login' });
  });

  router.post('/logout', async (_req, res) => {
    return res.status(200).json({ strategy: '${strategy}', action: 'logout' });
  });

  return router;
};
`,
  ),
];
