import type { LifecycleBuildResult } from "../types.js";

export function runSwLifecycleAgent(versionedCacheName: string, staleCachesToDelete: readonly string[]): Readonly<LifecycleBuildResult> {
  const staleList = staleCachesToDelete.map((item) => `"${item}"`).join(", ");

  return Object.freeze({
    script: [
      "self.addEventListener(\"install\", (event) => {",
      "  event.waitUntil(precacheAssets());",
      "  self.skipWaiting();",
      "});",
      "",
      "self.addEventListener(\"activate\", (event) => {",
      "  event.waitUntil((async () => {",
      "    const cacheNames = await caches.keys();",
      `    const protectedCaches = new Set([\"${versionedCacheName}\", ${staleList}]);`,
      "    await Promise.all(cacheNames.filter((name) => !protectedCaches.has(name)).map((name) => caches.delete(name)));",
      "    await self.clients.claim();",
      "  })());",
      "});",
    ].join("\n"),
    logs: Object.freeze([
      "sw-lifecycle: generated install lifecycle handler",
      "sw-lifecycle: generated activate lifecycle handler with cache cleanup",
    ]),
  });
}
