import type { AuthConfig } from '../types.js';

export const validateAuthConfig = (config: AuthConfig): string[] => {
  const errors: string[] = [];

  if (!config.issuer) errors.push('issuer is required');
  if (!config.audience) errors.push('audience is required');
  if (!config.accessTokenExpiry) errors.push('accessTokenExpiry is required');
  if (!config.refreshTokenExpiry) errors.push('refreshTokenExpiry is required');

  if (String(config.strategy).toUpperCase() === 'SESSION') {
    if (!config.session) errors.push('session configuration is required for SESSION strategy');
    if (config.session && !config.session.secureCookies) {
      errors.push('session.secureCookies must be true for secure deployments');
    }
  }

  return errors;
};
