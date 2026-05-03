import type { ErrorInfo, ResponseType } from "../types";
import { safeJsonParse } from "../utils/json-safe-parse.util";

export interface FallbackParseResult {
  type: Exclude<ResponseType, "unknown">;
  data: unknown;
  errors: ErrorInfo[];
}

const recoverPartialJson = (input: string): unknown | null => {
  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return null;
  }

  const snippet = input.slice(firstBrace, lastBrace + 1);
  const parsed = safeJsonParse(snippet);
  return parsed.parsed;
};

export const fallbackParseResponse = (input: string): FallbackParseResult => {
  const errors: ErrorInfo[] = [];
  const recoveredJson = recoverPartialJson(input);

  if (recoveredJson !== null) {
    errors.push({
      code: "FALLBACK_JSON_RECOVERY",
      message: "Recovered JSON from partial response.",
    });
    return { type: "json", data: recoveredJson, errors };
  }

  const text = input.trim();
  return {
    type: "text",
    data: {
      text,
      lines: text ? text.split("\n").map((line) => line.trim()).filter(Boolean) : [],
    },
    errors,
  };
};
