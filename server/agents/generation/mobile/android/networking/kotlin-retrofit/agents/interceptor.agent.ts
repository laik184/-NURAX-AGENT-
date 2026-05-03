import type { InterceptorDefinition, RetryPolicy } from "../types.js";

export function createInterceptors(enableLogging: boolean, retryPolicy: RetryPolicy): readonly InterceptorDefinition[] {
  const interceptors: InterceptorDefinition[] = [
    Object.freeze({
      name: "requestInterceptor",
      type: "request",
      description: "Applies request metadata and headers before dispatch",
    }),
    Object.freeze({
      name: "responseInterceptor",
      type: "response",
      description: `Normalizes responses and retries up to ${retryPolicy.maxRetries} times on transient failure`,
    }),
  ];

  if (enableLogging) {
    interceptors.push(
      Object.freeze({
        name: "httpLoggingInterceptor",
        type: "response",
        description: "Logs request/response line, headers, and timing for debugging",
      }),
    );
  }

  return Object.freeze(interceptors);
}
