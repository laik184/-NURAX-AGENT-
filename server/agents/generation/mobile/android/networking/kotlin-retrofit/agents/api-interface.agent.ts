import type { ApiEndpoint, ApiInterface } from "../types.js";

const annotationMap: Readonly<Record<ApiEndpoint["method"], string>> = Object.freeze({
  GET: "@GET",
  POST: "@POST",
  PUT: "@PUT",
  DELETE: "@DELETE",
});

export function createApiInterface(endpoints: readonly ApiEndpoint[]): ApiInterface {
  const annotations = endpoints.reduce<Record<string, string>>((acc, endpoint) => {
    acc[endpoint.name] = `${annotationMap[endpoint.method]}(\"${endpoint.path}\")`;
    return acc;
  }, {});

  return Object.freeze({
    endpoints: Object.freeze([...endpoints]),
    annotations: Object.freeze(annotations),
  });
}
