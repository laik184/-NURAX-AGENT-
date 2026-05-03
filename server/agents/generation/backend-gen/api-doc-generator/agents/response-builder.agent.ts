import type { ResponseDoc, RouteMeta, SchemaMeta } from "../types.js";

function defaultStatusCode(method: string): string {
  if (method === "post") {
    return "201";
  }

  if (method === "delete") {
    return "204";
  }

  return "200";
}

function schemaToOpenApi(schema?: SchemaMeta): unknown {
  if (!schema) {
    return { type: "object", additionalProperties: true };
  }

  return {
    type: "object",
    properties: Object.fromEntries(
      schema.fields.map((field) => [field.name, { type: field.type === "unknown" ? "string" : field.type }]),
    ),
  };
}

function findMatchingResponseSchema(route: RouteMeta, schemas: readonly SchemaMeta[]): SchemaMeta | undefined {
  if (route.responseTypeName) {
    return schemas.find((schema) => schema.name === route.responseTypeName);
  }

  const cleaned = route.handlerName.toLowerCase().replace(/(create|update|get|delete|list)/g, "");
  return schemas.find((schema) => cleaned.includes(schema.name.toLowerCase().replace(/response$/, "")));
}

export function buildResponseDocs(routes: readonly RouteMeta[], schemas: readonly SchemaMeta[]): readonly ResponseDoc[] {
  return Object.freeze(
    routes.map((route) => {
      const statusCode = defaultStatusCode(route.method);
      const responseSchema = findMatchingResponseSchema(route, schemas);

      const responses = {
        [statusCode]: {
          description: "Success",
          content:
            statusCode === "204"
              ? undefined
              : {
                  "application/json": {
                    schema: schemaToOpenApi(responseSchema),
                  },
                },
        },
        "400": {
          description: "Bad request",
        },
        "500": {
          description: "Internal server error",
        },
      };

      return Object.freeze({
        routeId: route.id,
        responses: Object.freeze(responses),
      });
    }),
  );
}
