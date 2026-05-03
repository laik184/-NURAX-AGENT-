import type { PrecacheBuildResult, SWConfig } from "../types.js";

export function runPrecacheBuilderAgent(config: SWConfig, versionedCacheName: string): Readonly<PrecacheBuildResult> {
  const assets = config.precacheAssets.map((asset) => `"${asset}"`).join(", ");

  return Object.freeze({
    script: [
      "const PRECACHE_ASSETS = Object.freeze([" + assets + "]);",
      "",
      "async function precacheAssets() {",
      `  const cache = await caches.open(\"${versionedCacheName}\");`,
      "  await cache.addAll(PRECACHE_ASSETS);",
      "}",
    ].join("\n"),
    logs: Object.freeze([
      `precache-builder: prepared ${config.precacheAssets.length} precache assets`,
      "precache-builder: generated app-shell preload logic",
    ]),
  });
}
