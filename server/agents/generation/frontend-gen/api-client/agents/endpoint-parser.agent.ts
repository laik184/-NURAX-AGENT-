import type {
  Endpoint,
  ParsedEndpointCollection,
  HttpMethod,
} from "../types.js";
import { buildOperationName } from "../utils/naming.util.js";
import { logInfo } from "../utils/logger.util.js";

type OpenApiLike = {
  readonly paths?: Record<string, Record<string, { operationId?: string; security?: unknown[]; requestBody?: unknown; parameters?: { in?: string; name?: string }[] }>>;
};

const METHODS: readonly HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function extractPathParams(path: string): readonly string[] {
  return Object.freeze(Array.from(path.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((match) => match[1]));
}

function isOpenApiLike(value: unknown): value is OpenApiLike {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseEndpoints(schema: unknown): ParsedEndpointCollection {
  if (!isOpenApiLike(schema) || !schema.paths) {
    return Object.freeze({
      endpoints: Object.freeze([]),
      logs: Object.freeze([logInfo("No OpenAPI paths found; generated empty endpoint list.")]),
    });
  }

  const endpoints: Endpoint[] = [];

  for (const [path, operations] of Object.entries(schema.paths)) {
    for (const [rawMethod, operation] of Object.entries(operations)) {
      const method = rawMethod.toUpperCase() as HttpMethod;
      if (!METHODS.includes(method)) continue;

      const queryParams = (operation.parameters ?? [])
        .filter((parameter) => parameter.in === "query" && typeof parameter.name === "string")
        .map((parameter) => parameter.name as string);

      endpoints.push(Object.freeze({
        path,
        method,
        operationId: operation.operationId ?? buildOperationName(path, method),
        requiresAuth: Array.isArray(operation.security) && operation.security.length > 0,
        queryParams: Object.freeze(queryParams),
        pathParams: extractPathParams(path),
        hasBody: Boolean(operation.requestBody),
      }));
    }
  }

  return Object.freeze({
    endpoints: Object.freeze(endpoints),
    logs: Object.freeze([logInfo(`Parsed ${endpoints.length} endpoint(s).`)]),
  });
}
