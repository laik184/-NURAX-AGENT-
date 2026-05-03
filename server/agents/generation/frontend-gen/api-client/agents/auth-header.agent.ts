import type { ApiRequest, ClientConfig } from "../types.js";

export function attachAuthHeaders(request: ApiRequest, config: ClientConfig): ApiRequest {
  if (!request.endpoint.requiresAuth) {
    return request;
  }

  const tokenAccessor = config.authTokenAccessor ?? "localStorage.getItem(\"token\")";

  return Object.freeze({
    ...request,
    authHeader: Object.freeze({
      Authorization: `Bearer ${'${'}${tokenAccessor} ?? \"\"}`,
    }),
  });
}
