import type { AuthConfig, GeneratedFile } from '../types.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateSessionAuth = (config: AuthConfig): GeneratedFile[] => {
  const cookieName = config.session?.cookieName ?? 'sid';
  const sameSite = config.session?.sameSite ?? 'strict';
  const maxAgeMs = config.session?.maxAgeMs ?? 1000 * 60 * 60 * 24;

  return [
    createGeneratedFile(
      'generated/auth/session/session-config.ts',
      `
export const sessionConfig = {
  cookieName: '${cookieName}',
  secure: true,
  httpOnly: true,
  sameSite: '${sameSite}',
  maxAgeMs: ${maxAgeMs},
};

export const createSession = async () => {
  // validate credentials -> create session record in approved session store adapter.
};
`,
    ),
  ];
};
