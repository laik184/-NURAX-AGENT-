import type { RequestDoc, RouteMeta, SchemaMeta } from "../types.js";

function schemaToOpenApi(schema?: SchemaMeta): unknown {
  if (!schema) {
    return { type: "object", additionalProperties: true };
  }

  return {
    type: "object",
    properties: Object.fromEntries(
      schema.fields.map((field) => [field.name, { type: field.type === "unknown" ? "string" : field.type }]),
    ),
    required: schema.fields.filter((field) => field.required).map((field) => field.name),
  };
}

function findMatchingRequestSchema(route: RouteMeta, schemas: readonly SchemaMeta[]): SchemaMeta | undefined {
  if (route.requestTypeName) {
    return schemas.find((schema) => schema.name === route.requestTypeName);
  }

  const normalized = route.handlerName.toLowerCase();
  return schemas.find((schema) => normalized.includes(schema.name.toLowerCase().replace(/dto$/, "")));
}

export function buildRequestDocs(routes: readonly RouteMeta[], schemas: readonly SchemaMeta[]): readonly RequestDoc[] {
  return Object.freeze(
    routes.map((route) => {
      const requestSchema = findMatchingRequestSchema(route, schemas);
      const params = [
        ...route.pathParams.map((param) => ({
          name: param,
          in: "path" as const,
          required: true,
          schema: { type: "string" },
        })),
        ...route.queryParams.map((param) => ({
          name: param,
          in: "query" as const,
          required: false,
          schema: { type: "string" },
        })),
      ];

      const supportsBody = ["post", "put", "patch"].includes(route.method);
      const requestBody = supportsBody
        ? {
            required: true,
            content: {
              "application/json": {
                schema: schemaToOpenApi(requestSchema),
              },
            },
          }
        : undefined;

      return Object.freeze({
        routeId: route.id,
        parameters: Object.freeze(params),
        requestBody,
      });
    }),
  );
}
