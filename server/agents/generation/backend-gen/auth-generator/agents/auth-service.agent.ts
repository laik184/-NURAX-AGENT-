import type { AuthConfig, GeneratedFile } from '../types.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateAuthService = (config: AuthConfig): GeneratedFile[] => [
  createGeneratedFile(
    'generated/auth/service/auth.service.ts',
    `
export const validateUserCredentials = async (email: string, password: string) => {
  // fetch user through repository adapter -> compare password hash.
  return { email, passwordValidated: Boolean(password) };
};

export const generateAuthTokens = async (subject: string, role: string) => ({
  sub: subject,
  role,
  accessTokenExpiry: '${config.accessTokenExpiry}',
  refreshTokenExpiry: '${config.refreshTokenExpiry}',
});
`,
  ),
];
