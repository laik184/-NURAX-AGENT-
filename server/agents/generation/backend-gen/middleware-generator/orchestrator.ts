import { dispatchMiddlewareGeneration } from "./agents/middleware-generator.agent.js";
import { initialMiddlewareGeneratorState, type MiddlewareGeneratorState } from "./state.js";
import type { MiddlewareConfig, MiddlewareResult } from "./types.js";

function evolveState(
  state: MiddlewareGeneratorState,
  patch: Partial<MiddlewareGeneratorState>,
): MiddlewareGeneratorState {
  return Object.freeze({
    ...state,
    ...patch,
  });
}

export function generateMiddleware(config: MiddlewareConfig): {
  readonly result: MiddlewareResult;
  readonly state: MiddlewareGeneratorState;
} {
  let state = evolveState(initialMiddlewareGeneratorState, {
    framework: config.framework,
    status: "GENERATING",
    logs: [`Received request for type=${config.type} framework=${config.framework}`],
    errors: [],
  });

  try {
    const result = dispatchMiddlewareGeneration(config);

    state = evolveState(state, {
      generatedMiddlewares: [...state.generatedMiddlewares, result],
      status: "SUCCESS",
      logs: [...state.logs, ...result.logs, "Middleware generation flow completed"],
    });

    return Object.freeze({ result, state });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown middleware generation error";

    const failureResult: MiddlewareResult = Object.freeze({
      success: false,
      name: config.name ?? `${config.framework}-${config.type}-middleware`,
      code: "",
      framework: config.framework,
      logs: [...state.logs, "Middleware generation flow failed"],
      error: errorMessage,
    });

    state = evolveState(state, {
      status: "FAILED",
      errors: [...state.errors, errorMessage],
      logs: [...state.logs, errorMessage],
    });

    return Object.freeze({ result: failureResult, state });
  }
}
