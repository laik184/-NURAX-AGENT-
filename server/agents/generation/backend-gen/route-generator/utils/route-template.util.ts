import type { Endpoint, HttpMethod, SupportedFramework } from "../types";

const nestDecoratorMap: Record<HttpMethod, string> = {
  GET: "Get",
  POST: "Post",
  PUT: "Put",
  PATCH: "Patch",
  DELETE: "Delete",
};

const expressMethodMap: Record<HttpMethod, string> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

export const renderRouteTemplate = (
  framework: SupportedFramework,
  endpoint: Endpoint,
  method: HttpMethod,
  normalizedPath: string,
): string => {
  if (framework === "express") {
    const expressMethod = expressMethodMap[method];
    return `router.${expressMethod}('${normalizedPath}', ${endpoint.controller}.${endpoint.action});`;
  }

  const decorator = nestDecoratorMap[method];
  const nestPath = normalizedPath.replace(/^\//, "");
  return `@${decorator}('${nestPath}')\n${endpoint.action}() {}`;
};
