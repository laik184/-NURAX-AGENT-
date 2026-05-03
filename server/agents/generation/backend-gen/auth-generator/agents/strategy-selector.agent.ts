import type { AuthConfig, AuthStrategy } from '../types.js';
import { normalizeStrategy } from '../utils/config.util.js';

export const selectAuthStrategy = (config: AuthConfig): AuthStrategy =>
  normalizeStrategy(config.strategy);
