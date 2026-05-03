import { generateAuthModule as runGeneration } from './orchestrator.js';
import { selectAuthStrategy } from './agents/strategy-selector.agent.js';
import type { AuthConfig, AuthModuleOutput, AuthStrategy } from './types.js';
import { validateAuthConfig } from './utils/validator.util.js';

export const validateAuth = (config: AuthConfig): boolean => validateAuthConfig(config).length === 0;

export const getAuthStrategy = (config: AuthConfig): AuthStrategy => selectAuthStrategy(config);

export const generateAuthModule = (config: AuthConfig): Readonly<AuthModuleOutput> => runGeneration(config);

export type {
  AuthConfig,
  AuthModuleOutput,
  AuthStatus,
  AuthStrategy,
  Permission,
  Role,
  TokenPayload,
} from './types.js';
