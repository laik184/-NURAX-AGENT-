import { buildApiClient } from "./agents/api-client-builder.agent.js";
import { buildErrorType } from "./agents/error-handler.agent.js";
import { buildAuthHeaderInjection } from "./agents/auth-header.agent.js";
import { mapEndpoints } from "./agents/endpoint-mapper.agent.js";
import { buildRequestBuilder } from "./agents/request-builder.agent.js";
import { buildResponseParser } from "./agents/response-parser.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  EndpointConfig,
  GeneratedFile,
  NetworkingGenerationInput,
  NetworkingOutput,
  ResponseModel,
} from "./types.js";
import { error, info } from "./utils/logger.util.js";

function freezeFiles(files: readonly GeneratedFile[]): readonly GeneratedFile[] {
  return Object.freeze(files.map((file) => Object.freeze({ ...file })));
}

function freezeOutput(output: NetworkingOutput): Readonly<NetworkingOutput> {
  return Object.freeze({
    ...output,
    files: freezeFiles(output.files),
    logs: Object.freeze([...output.logs]),
  });
}

export function validateAPIConfig(input: Readonly<NetworkingGenerationInput>): boolean {
  if (!input.baseURL || typeof input.baseURL !== "string") {
    return false;
  }

  if (!Array.isArray(input.endpoints) || input.endpoints.length === 0) {
    return false;
  }

  return input.endpoints.every((endpoint: EndpointConfig) => {
    return Boolean(endpoint.name && endpoint.path && endpoint.method && endpoint.responseType);
  });
}

export function generateNetworkingLayer(
  input: Readonly<NetworkingGenerationInput>,
): Readonly<NetworkingOutput> {
  let state = transitionState(INITIAL_STATE, {
    status: "BUILDING",
    baseURL: input.baseURL,
    endpoints: input.endpoints,
    headers: input.headers ?? {},
    authToken: input.authToken,
    logs: [info("Generation started")],
  });

  try {
    if (!validateAPIConfig(input)) {
      throw new Error("Invalid API configuration: baseURL and endpoints are required.");
    }

    state = transitionState(state, {
      logs: [...state.logs, info("Mapped endpoint definitions")],
    });

    const responseModels: ResponseModel[] = input.endpoints.map((endpoint) => ({
      endpointName: endpoint.name,
      responseType: endpoint.responseType,
    }));

    const authInjectors = Object.fromEntries(
      input.endpoints.map((endpoint) => [
        endpoint.name,
        buildAuthHeaderInjection(endpoint, Boolean(input.authToken)),
      ]),
    );

    const files: GeneratedFile[] = [
      Object.freeze({ name: "Endpoints.swift", content: mapEndpoints(input.endpoints) }),
      Object.freeze({
        name: "RequestBuilder.swift",
        content: buildRequestBuilder(input.endpoints, input.headers ?? {}, authInjectors),
      }),
      Object.freeze({ name: "NetworkError.swift", content: buildErrorType() }),
      Object.freeze({
        name: "APIClient.swift",
        content: buildApiClient(input.endpoints, input.apiClient, Boolean(input.authToken)),
      }),
      Object.freeze({ name: "ResponseParser.swift", content: buildResponseParser(responseModels) }),
    ];

    state = transitionState(state, {
      status: "COMPLETE",
      logs: [...state.logs, info("Generated Swift networking files")],
    });

    return freezeOutput({
      success: true,
      files,
      logs: state.logs,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown generation error";
    state = transitionState(state, {
      status: "FAILED",
      errors: [...state.errors, message],
      logs: [...state.logs, error(message)],
    });

    return freezeOutput({
      success: false,
      files: [],
      logs: state.logs,
      error: message,
    });
  }
}
