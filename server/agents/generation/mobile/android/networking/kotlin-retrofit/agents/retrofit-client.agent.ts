import type { RetrofitClient, RetrofitConfig } from "../types.js";

export function createRetrofitClientInstance(
  config: RetrofitConfig,
  interceptors: RetrofitClient["interceptors"],
): RetrofitClient {
  return Object.freeze({
    baseUrl: config.baseUrl,
    converterFactory: config.converter === "gson" ? "GsonConverterFactory" : "MoshiConverterFactory",
    timeouts: Object.freeze({
      connectMs: config.connectTimeoutMs,
      readMs: config.readTimeoutMs,
      writeMs: config.writeTimeoutMs,
    }),
    interceptors: Object.freeze([...interceptors]),
    retryPolicy: config.retryPolicy,
  });
}
