import type { RuntimeCacheBuildResult, SWConfig } from "../types.js";

export function runRuntimeCacheAgent(config: SWConfig): Readonly<RuntimeCacheBuildResult> {
  const routeEntries = config.runtimeRoutes
    .map(
      (route) =>
        `{ pattern: ${route.pattern.toString()}, strategy: \"${route.strategy}\" }`,
    )
    .join(",\n  ");

  return Object.freeze({
    script: [
      "const RUNTIME_ROUTES = Object.freeze([",
      `  ${routeEntries}`,
      "]);",
      "",
      "function selectStrategy(normalizedRequestUrl) {",
      "  const matched = RUNTIME_ROUTES.find((route) => route.pattern.test(normalizedRequestUrl));",
      "  return matched ? matched.strategy : \"network-first\";",
      "}",
      "",
      "async function routeRuntimeRequest(request, normalizedRequestUrl) {",
      "  const strategy = selectStrategy(normalizedRequestUrl);",
      "  if (strategy === \"cache-first\") return runCacheFirst(request);",
      "  if (strategy === \"stale-while-revalidate\") return runStaleWhileRevalidate(request);",
      "  return runNetworkFirst(request);",
      "}",
    ].join("\n"),
    logs: Object.freeze([
      `runtime-cache: configured ${config.runtimeRoutes.length} runtime route strategies`,
      "runtime-cache: set strategy routing defaults",
    ]),
  });
}
