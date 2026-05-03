import type {
  ApiRequest,
  ClientConfig,
  Endpoint,
  RequestTemplate,
} from "../types.js";

export function buildApiRequest(endpoint: Endpoint, config: ClientConfig): ApiRequest {
  return Object.freeze({
    endpoint,
    client: config.client,
    baseHeaders: Object.freeze({
      "Content-Type": "application/json",
      ...(config.defaultHeaders ?? {}),
    }),
    authHeader: Object.freeze({}),
  });
}

export function buildRequestTemplate(request: ApiRequest): RequestTemplate {
  return Object.freeze({
    functionName: request.endpoint.operationId,
    pathTemplate: request.endpoint.path,
    method: request.endpoint.method,
    headers: Object.freeze({ ...request.baseHeaders, ...request.authHeader }),
    requiresAuth: request.endpoint.requiresAuth,
    queryParams: request.endpoint.queryParams,
    pathParams: request.endpoint.pathParams,
    hasBody: request.endpoint.hasBody,
  });
}
