import type { AuthStrategy, GeneratedFile } from '../types.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateAuthMiddleware = (strategy: AuthStrategy): GeneratedFile[] => [
  createGeneratedFile(
    'generated/auth/middleware/auth.middleware.ts',
    `
import type { NextFunction, Request, Response } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // verify ${strategy} credentials and attach identity to request.
  return next();
};

export const authorize = (requiredRole: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    const role = String(req.headers['x-role'] ?? 'user');
    if (role !== requiredRole) {
      return res.status(403).json({ error: 'forbidden' });
    }

    return next();
  };
`,
  ),
];
