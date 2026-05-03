import type { AuthConfig, GeneratedFile } from '../types.js';
import { createGeneratedFile } from '../utils/template.util.js';

export const generateOAuthAuth = (config: AuthConfig): GeneratedFile[] => {
  const providers = config.oauthProviders?.length ? config.oauthProviders.join(', ') : 'google, github';

  return [
    createGeneratedFile(
      'generated/auth/oauth/oauth-flow.ts',
      `
export const oauthProviders = [${providers
        .split(',')
        .map((provider) => `'${provider.trim()}'`)
        .join(', ')}] as const;

export const startOAuthFlow = (provider: string) => {
  // redirect to provider authorization URL (google/github)
};

export const handleOAuthCallback = async (provider: string, code: string) => {
  // exchange code -> verify profile -> map user -> issue session/token.
};
`,
    ),
  ];
};
