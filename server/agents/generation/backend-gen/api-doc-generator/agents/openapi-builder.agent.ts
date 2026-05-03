import type { OpenAPISpec, RequestDoc, ResponseDoc, RouteMeta, SchemaMeta } from "../types.js";

function schemaMetaToOpenApi(schema: SchemaMeta): unknown {
  return {
    type: "object",
    properties: Object.fromEntries(
      schema.fields.map((field) => [field.name, { type: field.type === "unknown" ? "string" : field.type }]),
    ),
    required: schema.fields.filter((field) => field.required).map((field) => field.name),
  };
}

export function buildOpenApiSpec(params: {
  readonly title: string;
  readonly version: string;
  readonly description: string;
  readonly routes: readonly RouteMeta[];
  readonly schemas: readonly SchemaMeta[];
  readonly requests: readonly RequestDoc[];
  readonly responses: readonly ResponseDoc[];
}): OpenAPISpec {
  const { title, version, description, routes, schemas, requests, responses } = params;

  const pathEntries: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    const request = requests.find((item) => item.routeId === route.id);
    const response = responses.find((item) => item.routeId === route.id);
    const pathDoc = pathEntries[route.path] ?? {};

    pathDoc[route.method] = {
      tags: route.tags,
      operationId: route.handlerName,
      parameters: request?.parameters ?? [],
      requestBody: request?.requestBody,
      responses: response?.responses ?? {
        "500": { description: "Unexpected error" },
      },
    };

    pathEntries[route.path] = pathDoc;
  }

  const schemaEntries = Object.fromEntries(schemas.map((schema) => [schema.name, schemaMetaToOpenApi(schema)]));
  const tags = [...new Set(routes.flatMap((route) => route.tags))].map((name) => ({ name }));

  return Object.freeze({
    openapi: "3.0.3",
    info: {
      title,
      version,
      description,
    },
    paths: pathEntries,
    components: {
      schemas: schemaEntries,
    },
    tags: Object.freeze(tags),
  });
}
