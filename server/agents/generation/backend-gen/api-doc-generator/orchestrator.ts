import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { buildOpenApiSpec } from "./agents/openapi-builder.agent.js";
import { attachExamples } from "./agents/example-generator.agent.js";
import { buildRequestDocs } from "./agents/request-builder.agent.js";
import { buildResponseDocs } from "./agents/response-builder.agent.js";
import { extractRoutes } from "./agents/route-extractor.agent.js";
import { extractSchemas } from "./agents/schema-extractor.agent.js";
import { createInitialState, type ApiDocGeneratorState } from "./state.js";
import type { GenerateApiDocsInput, GeneratedApiDocsOutput, OpenAPISpec } from "./types.js";
import { parseSource } from "./utils/ast-parser.util.js";
import { buildFrozenObject } from "./utils/json-builder.util.js";
import { logError, logEvent } from "./utils/logger.util.js";
import { dedupeSchemas } from "./utils/schema-normalizer.util.js";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

let cachedOpenApiSpec: OpenAPISpec | Record<string, never> = {};

async function collectSourceFiles(rootDir: string): Promise<readonly string[]> {
  const queue = [rootDir];
  const filePaths: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) {
          continue;
        }

        queue.push(resolved);
        continue;
      }

      if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
        filePaths.push(resolved);
      }
    }
  }

  return Object.freeze(filePaths);
}

function nextState(
  previous: ApiDocGeneratorState,
  patch: Partial<ApiDocGeneratorState>,
  message: string,
): ApiDocGeneratorState {
  return Object.freeze({
    ...previous,
    ...patch,
    logs: logEvent(previous.logs, message),
  });
}

function failState(previous: ApiDocGeneratorState, errorMessage: string): ApiDocGeneratorState {
  return Object.freeze({
    ...previous,
    status: "FAILED",
    logs: logEvent(previous.logs, "Pipeline failed"),
    errors: logError(previous.errors, errorMessage),
  });
}

export async function generateApiDocs(input: GenerateApiDocsInput): Promise<GeneratedApiDocsOutput> {
  let state = nextState(createInitialState(), { status: "PROCESSING" }, "Starting API documentation generation");

  try {
    const filePaths = await collectSourceFiles(input.rootDir);
    const sourceContents = await Promise.all(filePaths.map((filePath) => readFile(filePath, "utf8")));
    const parsed = filePaths.map((filePath, index) => parseSource(filePath, sourceContents[index] ?? ""));
    state = nextState(state, {}, `Scanned ${parsed.length} source files`);

    const routes = extractRoutes(parsed);
    state = nextState(state, { routes }, `Extracted ${routes.length} routes`);

    const schemas = dedupeSchemas(extractSchemas(parsed));
    state = nextState(state, { schemas }, `Extracted ${schemas.length} schemas`);

    const requests = buildRequestDocs(routes, schemas);
    state = nextState(state, { requests }, `Built ${requests.length} request docs`);

    const responses = buildResponseDocs(routes, schemas);
    state = nextState(state, { responses }, `Built ${responses.length} response docs`);

    const withExamples = attachExamples(requests, responses, schemas);
    state = nextState(
      state,
      { requests: withExamples.requests, responses: withExamples.responses },
      "Generated request/response examples",
    );

    const openapi = buildOpenApiSpec({
      title: input.title ?? "Generated API",
      version: input.version ?? "1.0.0",
      description: input.description ?? "Auto-generated OpenAPI documentation",
      routes: state.routes,
      schemas: state.schemas,
      requests: state.requests,
      responses: state.responses,
    });

    state = nextState(state, { openapi, status: "DONE" }, "Built OpenAPI specification");
    cachedOpenApiSpec = openapi;

    return buildFrozenObject({
      success: true,
      openapi,
      logs: state.logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API doc generation error";
    state = failState(state, message);

    return buildFrozenObject({
      success: false,
      openapi: {},
      logs: state.logs,
      error: message,
    });
  }
}

export function getOpenAPISpec(): OpenAPISpec | Record<string, never> {
  return cachedOpenApiSpec;
}
