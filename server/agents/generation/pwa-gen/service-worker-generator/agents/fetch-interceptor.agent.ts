import type { FetchInterceptorBuildResult } from "../types.js";
import { buildCacheMatchExpression } from "../utils/cache-matcher.util.js";
import { buildRequestNormalizationSnippet } from "../utils/request-normalizer.util.js";
import { buildResponseCloneExpression } from "../utils/response-cloner.util.js";

export function runFetchInterceptorAgent(versionedCacheName: string): Readonly<FetchInterceptorBuildResult> {
  const matchExpression = buildCacheMatchExpression("request");
  const cloneExpression = buildResponseCloneExpression("networkResponse");
  const normalizeSnippet = buildRequestNormalizationSnippet("url");

  return Object.freeze({
    script: [
      "async function runCacheFirst(request) {",
      `  const cached = await ${matchExpression};`,
      "  if (cached) return cached;",
      "  const networkResponse = await fetch(request);",
      `  const cloned = ${cloneExpression};`,
      `  const cache = await caches.open(\"${versionedCacheName}\");`,
      "  await cache.put(request, cloned);",
      "  return networkResponse;",
      "}",
      "",
      "async function runNetworkFirst(request) {",
      "  try {",
      "    const networkResponse = await fetch(request);",
      `    const cloned = ${cloneExpression};`,
      `    const cache = await caches.open(\"${versionedCacheName}\");`,
      "    await cache.put(request, cloned);",
      "    return networkResponse;",
      "  } catch (_error) {",
      `    const fallback = await ${matchExpression};`,
      "    if (fallback) return fallback;",
      "    throw _error;",
      "  }",
      "}",
      "",
      "async function runStaleWhileRevalidate(request) {",
      `  const cached = await ${matchExpression};`,
      "  const networkPromise = fetch(request).then(async (networkResponse) => {",
      `    const cache = await caches.open(\"${versionedCacheName}\");`,
      `    await cache.put(request, ${cloneExpression});`,
      "    return networkResponse;",
      "  });",
      "  return cached || networkPromise;",
      "}",
      "",
      "self.addEventListener(\"fetch\", (event) => {",
      "  const request = event.request;",
      "  const url = new URL(request.url);",
      `  ${normalizeSnippet}`,
      "  if (request.method !== \"GET\" || !normalizedRequestUrl.startsWith(self.location.origin)) {",
      "    return;",
      "  }",
      "  event.respondWith(routeRuntimeRequest(request, normalizedRequestUrl));",
      "});",
    ].join("\n"),
    logs: Object.freeze([
      "fetch-interceptor: generated fetch listener",
      "fetch-interceptor: wired request normalization and strategy dispatch",
    ]),
  });
}
