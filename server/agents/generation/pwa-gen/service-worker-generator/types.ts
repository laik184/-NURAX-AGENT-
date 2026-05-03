export type CacheStrategy = "network-first" | "cache-first" | "stale-while-revalidate";

export interface SWConfig {
  readonly version: string;
  readonly cacheName: string;
  readonly precacheAssets: readonly string[];
  readonly runtimeRoutes: readonly {
    readonly pattern: RegExp;
    readonly strategy: CacheStrategy;
  }[];
}

export interface SWResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface CacheConfigResult {
  readonly versionedCacheName: string;
  readonly staleCachesToDelete: readonly string[];
  readonly logs: readonly string[];
}

export interface PrecacheBuildResult {
  readonly script: string;
  readonly logs: readonly string[];
}

export interface LifecycleBuildResult {
  readonly script: string;
  readonly logs: readonly string[];
}

export interface FetchInterceptorBuildResult {
  readonly script: string;
  readonly logs: readonly string[];
}

export interface RuntimeCacheBuildResult {
  readonly script: string;
  readonly logs: readonly string[];
}

export interface RegistrationBuildResult {
  readonly script: string;
  readonly logs: readonly string[];
}

export interface ServiceWorkerArtifacts {
  readonly swScript: string;
  readonly registrationScript: string;
}
