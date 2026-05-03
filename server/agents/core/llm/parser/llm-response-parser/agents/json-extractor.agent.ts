import type { ErrorInfo } from "../types";
import { safeJsonParse } from "../utils/json-safe-parse.util";
import { JSON_FENCE_REGEX } from "../utils/regex.util";

export interface JsonExtractionResult {
  parsed: unknown | null;
  source: string | null;
  errors: ErrorInfo[];
}

const candidateJsonSegments = (input: string): string[] => {
  const candidates: string[] = [];
  for (const match of input.matchAll(JSON_FENCE_REGEX)) {
    if (match[1]) candidates.push(match[1].trim());
  }

  candidates.push(input.trim());

  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(input.slice(firstBrace, lastBrace + 1).trim());
  }

  return [...new Set(candidates.filter(Boolean))];
};

export const extractJson = (input: string): JsonExtractionResult => {
  const errors: ErrorInfo[] = [];
  const candidates = candidateJsonSegments(input);

  for (const candidate of candidates) {
    const result = safeJsonParse(candidate);
    if (result.parsed !== null) {
      return { parsed: result.parsed, source: candidate, errors };
    }

    if (result.error) {
      errors.push(result.error);
    }
  }

  return { parsed: null, source: null, errors };
};
