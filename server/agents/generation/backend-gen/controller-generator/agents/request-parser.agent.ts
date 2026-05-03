import type { MethodDefinition, RouteDefinition } from "../types.js";

function uniq(input: readonly string[]): readonly string[] {
  return Object.freeze(Array.from(new Set(input.filter(Boolean))));
}

export function parseRequests(routes: readonly RouteDefinition[]): readonly MethodDefinition[] {
  return Object.freeze(
    routes.map((route) => {
      const requestParams = uniq(Array.from(route.path.matchAll(/:([a-zA-Z0-9_]+)/g)).map((m) => m[1] ?? ""));
      const requestQuery = Object.freeze([] as string[]);
      const requestBody = Object.freeze(route.method === "GET" ? [] : ["payload"]);

      const lines: string[] = [];
      if (requestParams.length > 0) lines.push(`const params = req.params as Record<string, string>;`);
      if (requestQuery.length > 0) lines.push(`const query = req.query as Record<string, string | string[]>;`);
      if (requestBody.length > 0) lines.push("const body = req.body;");
      if (lines.length === 0) lines.push("const payload = undefined;");

      return Object.freeze({
        name: route.handlerName,
        serviceMethod: route.serviceMethod,
        route,
        requestParams,
        requestQuery,
        requestBody,
        requestExtractCode: lines.join("\n"),
      });
    }),
  );
}
