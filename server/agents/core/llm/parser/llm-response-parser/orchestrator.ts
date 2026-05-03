import { extractCodeFromResponse } from "./agents/code-block-extractor.agent";
import { detectResponseErrors } from "./agents/error-detector.agent";
import { fallbackParseResponse } from "./agents/fallback-parser.agent";
import { extractJson } from "./agents/json-extractor.agent";
import { cleanMarkdownResponse } from "./agents/markdown-cleaner.agent";
import { normalizeParsedStructure } from "./agents/structure-normalizer.agent";
import { createInitialParseState } from "./state";
import type { ParsedResponse, ResponseType } from "./types";
import { pushLog } from "./utils/logger.util";

export const detectResponseType = (rawResponse: string): ResponseType => {
  const jsonAttempt = extractJson(rawResponse);
  if (jsonAttempt.parsed !== null) return "json";

  const codeAttempt = extractCodeFromResponse(rawResponse);
  if (codeAttempt.blocks.length > 0) return "code";

  if (rawResponse.trim()) return "text";
  return "unknown";
};

export const normalizeResponse = (
  type: ResponseType,
  data: unknown,
  errors: ReturnType<typeof detectResponseErrors>,
  logs: string[],
): ParsedResponse => normalizeParsedStructure({ type, data, errors, logs });

export const parseLLMResponse = (rawResponse: string): ParsedResponse => {
  const state = createInitialParseState(rawResponse);
  state.status = "PROCESSING";
  pushLog(state.logs, "Starting LLM response parsing.");

  const cleaned = cleanMarkdownResponse(rawResponse);
  pushLog(state.logs, "Markdown cleanup completed.");

  state.errors.push(...detectResponseErrors(cleaned));
  pushLog(state.logs, "Error detection completed.");

  const jsonResult = extractJson(rawResponse);
  const jsonLikely = /```json/i.test(rawResponse) || /^[\s\n]*[\[{]/.test(rawResponse.trim());
  if (jsonLikely) {
    state.errors.push(...jsonResult.errors);
  }

  if (jsonResult.parsed !== null) {
    state.detectedType = "json";
    state.parsedOutput = jsonResult.parsed;
    state.status = state.errors.length ? "FAILED" : "SUCCESS";
    pushLog(state.logs, "JSON extraction successful.");
    return normalizeResponse(state.detectedType, state.parsedOutput, state.errors, state.logs);
  }

  if (!jsonLikely) {
    const codeResult = extractCodeFromResponse(rawResponse);
    if (codeResult.primary) {
      state.detectedType = "code";
      state.parsedOutput = {
        language: codeResult.primary.language,
        code: codeResult.primary.code,
        blocks: codeResult.blocks,
      };
      state.status = state.errors.length ? "FAILED" : "SUCCESS";
      pushLog(state.logs, "Code block extraction successful.");
      return normalizeResponse(state.detectedType, state.parsedOutput, state.errors, state.logs);
    }
  }

  const fallback = fallbackParseResponse(cleaned);
  state.detectedType = fallback.type;
  state.parsedOutput = fallback.data;
  state.errors.push(...fallback.errors);
  state.status = state.errors.length ? "FAILED" : "SUCCESS";
  pushLog(state.logs, "Fallback parser applied.");

  return normalizeResponse(state.detectedType, state.parsedOutput, state.errors, state.logs);
};
