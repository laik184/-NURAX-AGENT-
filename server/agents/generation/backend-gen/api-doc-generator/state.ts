import type { OpenAPISpec, RequestDoc, ResponseDoc, RouteMeta, SchemaMeta } from "./types.js";

export type PipelineStatus = "IDLE" | "PROCESSING" | "DONE" | "FAILED";

export interface ApiDocGeneratorState {
  readonly routes: readonly RouteMeta[];
  readonly schemas: readonly SchemaMeta[];
  readonly requests: readonly RequestDoc[];
  readonly responses: readonly ResponseDoc[];
  readonly openapi: OpenAPISpec | Record<string, never>;
  readonly status: PipelineStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export function createInitialState(): ApiDocGeneratorState {
  return Object.freeze({
    routes: [],
    schemas: [],
    requests: [],
    responses: [],
    openapi: {},
    status: "IDLE",
    logs: [],
    errors: [],
  });
}
