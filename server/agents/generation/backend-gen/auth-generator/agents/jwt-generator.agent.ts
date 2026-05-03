import type { AuthConfig, GeneratedFile } from '../types.js';
import { tokenTemplate } from '../utils/token.util.js';
import { hashTemplate } from '../utils/hash.util.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateJwtAuth = (config: AuthConfig): GeneratedFile[] => [
  createGeneratedFile('generated/auth/jwt/tokens.ts', tokenTemplate(config)),
  createGeneratedFile('generated/auth/jwt/password.ts', hashTemplate()),
  createGeneratedFile(
    'generated/auth/jwt/login-register.ts',
    `
export const registerWithJwt = async () => {
  // validate input -> hash password -> persist through repository adapter.
};

export const loginWithJwt = async () => {
  // validate credentials -> sign access/refresh tokens -> return both tokens.
};
`,
  ),
];
