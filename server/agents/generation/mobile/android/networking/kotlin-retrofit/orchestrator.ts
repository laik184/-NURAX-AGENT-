import { createApiInterface } from "./agents/api-interface.agent.js";
import { injectAuthHeader } from "./agents/auth-header.agent.js";
import { handleApiError } from "./agents/error-handler.agent.js";
import { createInterceptors } from "./agents/interceptor.agent.js";
import { mapResponseToModel } from "./agents/response-mapper.agent.js";
import { createRetrofitClientInstance } from "./agents/retrofit-client.agent.js";
import {
  appendError,
  appendHeader,
  appendLog,
  getNetworkingState,
  resetNetworkingState,
  setBaseUrl,
  setEndpoints,
  setInterceptors,
  setStatus,
} from "./state.js";
import type {
  ApiEndpoint,
  KotlinRetrofitOutput,
  NetworkError,
  ResponseModel,
  RetrofitConfig,
} from "./types.js";
import { mergeHeaders } from "./utils/header.util.js";
import { appendLog as appendLocalLog, createLog } from "./utils/logger.util.js";
import { buildBaseUrl } from "./utils/url-builder.util.js";

export function createRetrofitClient(
  config: RetrofitConfig,
  endpoints: readonly ApiEndpoint[],
): KotlinRetrofitOutput {
  resetNetworkingState();
  let logs: readonly string[] = Object.freeze([]);

  try {
    logs = appendLocalLog(logs, createLog("orchestrator", "building base URL"));
    const baseUrl = buildBaseUrl(config.baseUrl);
    setBaseUrl(baseUrl);

    logs = appendLocalLog(logs, createLog("orchestrator", "creating interceptors"));
    const interceptors = createInterceptors(config.enableLogging, config.retryPolicy);
    setInterceptors(interceptors.map((item) => item.name));

    logs = appendLocalLog(logs, createLog("orchestrator", "creating retrofit client"));
    const client = createRetrofitClientInstance({ ...config, baseUrl }, interceptors);

    logs = appendLocalLog(logs, createLog("orchestrator", "generating API interface"));
    const apiInterface = createApiInterface(endpoints);
    setEndpoints(apiInterface.endpoints);

    logs = appendLocalLog(logs, createLog("orchestrator", "attaching headers"));
    const headers = injectAuthHeader(mergeHeaders(config.defaultHeaders), config.token);
    appendHeader(headers);

    logs = appendLocalLog(logs, createLog("orchestrator", "wiring error handler"));
    const errorHandler = (error: unknown): NetworkError => handleApiError(error);

    logs = appendLocalLog(logs, createLog("orchestrator", "wiring response mapper"));
    const responseMapper = <T>(payload: string, statusCode: number): ResponseModel<T> =>
      mapResponseToModel<T>(payload, statusCode);

    for (const entry of logs) {
      appendLog(entry);
    }
    setStatus("READY");

    const output: KotlinRetrofitOutput = {
      success: true,
      client: Object.freeze({
        retrofit: client,
        apiInterface,
        defaultHeaders: headers,
        errorHandler,
        responseMapper,
      }),
      endpoints: apiInterface.endpoints,
      logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const normalized = handleApiError(error);
    appendError(normalized.message);
    setStatus("ERROR");

    const failedLogs = appendLocalLog(logs, createLog("orchestrator", `failed: ${normalized.message}`));
    for (const entry of failedLogs) {
      appendLog(entry);
    }

    return Object.freeze({
      success: false,
      client: Object.freeze({}),
      endpoints: [],
      logs: failedLogs,
      error: normalized.message,
    });
  }
}

export function getApiInterface(endpoints: readonly ApiEndpoint[]) {
  return createApiInterface(endpoints);
}

export function handleNetworkError(error: unknown): NetworkError {
  return handleApiError(error);
}

export function getNetworkingSnapshot() {
  return getNetworkingState();
}
