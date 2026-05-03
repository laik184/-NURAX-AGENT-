import type {
  ApiClientState,
  GeneratedFile,
  GenerationInput,
  GenerationResult,
  RequestTemplate,
} from "./types.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import { parseEndpoints } from "./agents/endpoint-parser.agent.js";
import { buildApiRequest, buildRequestTemplate } from "./agents/request-builder.agent.js";
import { attachAuthHeaders } from "./agents/auth-header.agent.js";
import { buildResponseHelper } from "./agents/response-handler.agent.js";
import {
  buildErrorHelper,
  normalizeApiError,
  toErrorLog,
} from "./agents/error-handler.agent.js";
import { generateApiClientFile } from "./agents/api-client-generator.agent.js";
import { formatFileContent } from "./utils/file-format.util.js";
import { logInfo } from "./utils/logger.util.js";

function freezeResult(result: GenerationResult): Readonly<GenerationResult> {
  return Object.freeze({
    ...result,
    files: Object.freeze(result.files.map((file) => Object.freeze({ ...file }))),
    logs: Object.freeze([...result.logs]),
  });
}

function createGeneratedFile(content: string): GeneratedFile {
  return Object.freeze({
    name: "api.client.ts",
    content: formatFileContent(content),
  });
}

function applyStage(
  currentState: Readonly<ApiClientState>,
  patch: Partial<ApiClientState>,
  logMessage?: string,
): Readonly<ApiClientState> {
  const nextLogs = logMessage ? [...currentState.logs, logMessage] : [...currentState.logs];
  return transitionState(currentState, { ...patch, logs: nextLogs });
}

export function generateApiClient(input: GenerationInput): Readonly<GenerationResult> {
  let state = applyStage(INITIAL_STATE, { status: "GENERATING" }, logInfo("Generation started."));

  try {
    const parsed = parseEndpoints(input.schema);
    state = applyStage(state, { endpoints: parsed.endpoints }, parsed.logs.join(" | "));

    const templates: RequestTemplate[] = parsed.endpoints
      .map((endpoint) => buildApiRequest(endpoint, input.config))
      .map((request) => attachAuthHeaders(request, input.config))
      .map((request) => buildRequestTemplate(request));

    state = applyStage(state, {}, logInfo(`Built ${templates.length} request template(s).`));

    const helpers = [buildResponseHelper(), buildErrorHelper()];
    const apiClientSource = generateApiClientFile(templates, input.config, helpers);
    const generatedFile = createGeneratedFile(apiClientSource);

    state = applyStage(
      state,
      {
        generatedFiles: [generatedFile],
        status: "SUCCESS",
      },
      logInfo("Generation completed successfully."),
    );

    return freezeResult({
      success: true,
      files: state.generatedFiles,
      logs: state.logs,
    });
  } catch (error) {
    const message = normalizeApiError(error);
    state = applyStage(
      state,
      {
        status: "FAILED",
        errors: [...state.errors, message],
      },
      toErrorLog(message),
    );

    return freezeResult({
      success: false,
      files: state.generatedFiles,
      logs: state.logs,
      error: message,
    });
  }
}
