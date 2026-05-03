import { generateAuthMiddleware } from "./agents/auth-middleware.agent.js";
import { generateErrorMiddleware } from "./agents/error-middleware.agent.js";
import { generateMiddleware as generateWithState } from "./orchestrator.js";
import type { MiddlewareConfig, MiddlewareResult } from "./types.js";

export function generateMiddleware(config: MiddlewareConfig): MiddlewareResult {
  return generateWithState(config).result;
}

export { generateAuthMiddleware, generateErrorMiddleware };

export type { FrameworkType, MiddlewareConfig, MiddlewareResult, MiddlewareType } from "./types.js";
export type { GeneratorStatus, MiddlewareGeneratorState } from "./state.js";
