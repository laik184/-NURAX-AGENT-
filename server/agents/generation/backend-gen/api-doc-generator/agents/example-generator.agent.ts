import type { RequestDoc, ResponseDoc, SchemaMeta } from "../types.js";

function fieldExample(type: string): unknown {
  if (type === "number") {
    return 42;
  }

  if (type === "boolean") {
    return true;
  }

  if (type === "array") {
    return [];
  }

  if (type === "object") {
    return {};
  }

  return "sample-value";
}

function buildSchemaExample(schema: SchemaMeta | undefined): unknown {
  if (!schema) {
    return { sample: "payload" };
  }

  return Object.fromEntries(schema.fields.map((field) => [field.name, fieldExample(field.type)]));
}

export function attachExamples(
  requests: readonly RequestDoc[],
  responses: readonly ResponseDoc[],
  schemas: readonly SchemaMeta[],
): {
  readonly requests: readonly RequestDoc[];
  readonly responses: readonly ResponseDoc[];
} {
  const requestsWithExamples = requests.map((request) => {
    if (!request.requestBody) {
      return request;
    }

    const schema = schemas.find((item) => JSON.stringify(request.requestBody).includes(item.name));
    return Object.freeze({
      ...request,
      requestBody: {
        ...request.requestBody,
        content: {
          "application/json": {
            ...request.requestBody.content["application/json"],
            example: buildSchemaExample(schema),
          },
        },
      },
    });
  });

  const responsesWithExamples = responses.map((response) => {
    const builtResponses = Object.fromEntries(
      Object.entries(response.responses).map(([status, doc]) => {
        if (!doc.content) {
          return [status, doc];
        }

        const schema = schemas.find((item) => JSON.stringify(doc.content).includes(item.name));
        return [
          status,
          {
            ...doc,
            content: {
              "application/json": {
                ...doc.content["application/json"],
                example: buildSchemaExample(schema),
              },
            },
          },
        ];
      }),
    );

    return Object.freeze({
      ...response,
      responses: Object.freeze(builtResponses),
    });
  });

  return Object.freeze({
    requests: Object.freeze(requestsWithExamples),
    responses: Object.freeze(responsesWithExamples),
  });
}
