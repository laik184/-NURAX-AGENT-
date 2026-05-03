import { generateAuthMiddleware } from "./auth-middleware.agent.js";
import { generateErrorMiddleware } from "./error-middleware.agent.js";
import { generateLoggingMiddleware } from "./logging-middleware.agent.js";
import { generateRateLimitMiddleware } from "./rate-limit-middleware.agent.js";
import { generateValidationMiddleware } from "./validation-middleware.agent.js";
import type { MiddlewareConfig, MiddlewareResult } from "../types.js";

export function dispatchMiddlewareGeneration(config: MiddlewareConfig): MiddlewareResult {
  if (config.type === "auth") {
    return generateAuthMiddleware(config);
  }

  if (config.type === "logging") {
    return generateLoggingMiddleware(config);
  }

  if (config.type === "validation") {
    return generateValidationMiddleware(config);
  }

  if (config.type === "error") {
    return generateErrorMiddleware(config);
  }

  return generateRateLimitMiddleware(config);
}
