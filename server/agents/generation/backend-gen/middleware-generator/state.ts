import type { FrameworkType, MiddlewareResult } from "./types.js";

export type GeneratorStatus = "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";

export interface MiddlewareGeneratorState {
  readonly generatedMiddlewares: readonly MiddlewareResult[];
  readonly framework: FrameworkType;
  readonly status: GeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export const initialMiddlewareGeneratorState: MiddlewareGeneratorState = Object.freeze({
  generatedMiddlewares: [],
  framework: "express",
  status: "IDLE",
  logs: [],
  errors: [],
});
