import { generateAuthController } from './agents/auth-controller.agent.js';
import { generateAuthMiddleware } from './agents/middleware-generator.agent.js';
import { generateAuthService } from './agents/auth-service.agent.js';
import { generateJwtAuth } from './agents/jwt-generator.agent.js';
import { generateOAuthAuth } from './agents/oauth-generator.agent.js';
import { generateRbac } from './agents/rbac-generator.agent.js';
import { generateSessionAuth } from './agents/session-generator.agent.js';
import { selectAuthStrategy } from './agents/strategy-selector.agent.js';
import { createInitialState, transitionState } from './state.js';
import type { AuthConfig, AuthModuleOutput, GeneratedFile } from './types.js';
import { getDefaultPermissions, getDefaultRoles } from './utils/config.util.js';
import { mergeGeneratedFiles } from './utils/template.util.js';
import { validateAuthConfig } from './utils/validator.util.js';

const strategyGenerators = {
  JWT: generateJwtAuth,
  OAUTH: generateOAuthAuth,
  SESSION: generateSessionAuth,
} as const;

export const generateAuthModule = (config: AuthConfig): Readonly<AuthModuleOutput> => {
  let state = createInitialState();

  const validationErrors = validateAuthConfig(config);
  if (validationErrors.length > 0) {
    state = transitionState(state, {
      status: 'FAILED',
      error: validationErrors.join('; '),
      log: 'Validation failed for auth configuration.',
    });

    return Object.freeze({
      success: false,
      files: [],
      strategy: String(config.strategy),
      logs: state.logs,
      error: state.errors.join('; '),
    });
  }

  const strategy = selectAuthStrategy(config);
  const roles = getDefaultRoles(config);
  const permissions = getDefaultPermissions(config);

  state = transitionState(state, {
    strategy,
    roles,
    permissions,
    status: 'GENERATING',
    log: `Auth module generation started with strategy: ${strategy}`,
  });

  const strategyFiles: GeneratedFile[] = strategyGenerators[strategy](config);
  const controllerFiles = generateAuthController(strategy);
  const serviceFiles = generateAuthService(config);
  const rbacFiles = generateRbac(roles, permissions);
  const middlewareFiles = generateAuthMiddleware(strategy);

  const files = mergeGeneratedFiles(
    strategyFiles,
    controllerFiles,
    serviceFiles,
    rbacFiles,
    middlewareFiles,
  );

  state = transitionState(state, {
    status: 'SUCCESS',
    generatedFiles: files.map((file) => file.path),
    log: `Generated ${files.length} files for ${strategy} strategy.`,
  });

  return Object.freeze({
    success: true,
    files,
    strategy,
    logs: state.logs,
  });
};
