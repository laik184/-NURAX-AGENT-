import type { AuthConfig, TokenPayload } from '../types.js';

export const tokenTemplate = (config: AuthConfig): string => `
import jwt from 'jsonwebtoken';

const issuer = '${config.issuer}';
const audience = '${config.audience}';

export const signAccessToken = (payload: Record<string, unknown>) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    issuer,
    audience,
    expiresIn: '${config.accessTokenExpiry}',
  });

export const signRefreshToken = (payload: Record<string, unknown>) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    issuer,
    audience,
    expiresIn: '${config.refreshTokenExpiry}',
  });

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET as string, {
    issuer,
    audience,
  }) as TokenPayload;
`;
