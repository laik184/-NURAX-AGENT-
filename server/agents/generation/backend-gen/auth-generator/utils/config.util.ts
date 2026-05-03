import type { AuthConfig, AuthStrategy } from '../types.js';

export const normalizeStrategy = (strategy: string): AuthStrategy => {
  const normalized = strategy.toUpperCase();
  if (normalized === 'JWT' || normalized === 'OAUTH' || normalized === 'SESSION') {
    return normalized;
  }
  return 'JWT';
};

export const getDefaultRoles = (config: AuthConfig): string[] =>
  config.roles && config.roles.length > 0 ? config.roles : ['admin', 'user'];

export const getDefaultPermissions = (config: AuthConfig): string[] =>
  config.permissions && config.permissions.length > 0
    ? config.permissions
    : ['auth:login', 'auth:register', 'auth:logout', 'auth:refresh'];
