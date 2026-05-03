import { runCacheConfigAgent } from "./agents/cache-config.agent.js";
import { runFetchInterceptorAgent } from "./agents/fetch-interceptor.agent.js";
import { runPrecacheBuilderAgent } from "./agents/precache-builder.agent.js";
import { runRuntimeCacheAgent } from "./agents/runtime-cache.agent.js";
import { runSwLifecycleAgent } from "./agents/sw-lifecycle.agent.js";
import { runSwRegistrationAgent } from "./agents/sw-registration.agent.js";
import type { SWConfig, SWResult } from "./types.js";

export function runServiceWorker(config: SWConfig): Readonly<SWResult> {
  try {
    const cacheConfig = runCacheConfigAgent(config);
    const precache = runPrecacheBuilderAgent(config, cacheConfig.versionedCacheName);
    const lifecycle = runSwLifecycleAgent(cacheConfig.versionedCacheName, cacheConfig.staleCachesToDelete);
    const fetchInterceptor = runFetchInterceptorAgent(cacheConfig.versionedCacheName);
    const runtimeCache = runRuntimeCacheAgent(config);
    const registration = runSwRegistrationAgent();

    const swScript = [
      `const CACHE_VERSION = \"${config.version}\";`,
      `const CACHE_NAME = \"${cacheConfig.versionedCacheName}\";`,
      "",
      precache.script,
      "",
      lifecycle.script,
      "",
      runtimeCache.script,
      "",
      fetchInterceptor.script,
    ].join("\n");

    return Object.freeze({
      success: true,
      logs: Object.freeze([
        ...cacheConfig.logs,
        ...precache.logs,
        ...lifecycle.logs,
        ...fetchInterceptor.logs,
        ...runtimeCache.logs,
        ...registration.logs,
        `artifact: sw.js generated (${swScript.length} chars)`,
        swScript,
        "artifact: registration script generated",
        registration.script,
      ]),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown service worker generation failure";

    return Object.freeze({
      success: false,
      logs: Object.freeze(["service-worker-generator: failed to produce artifacts"]),
      error: errorMessage,
    });
  }
}
