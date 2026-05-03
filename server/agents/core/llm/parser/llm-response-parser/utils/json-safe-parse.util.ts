import type { ErrorInfo } from "../types";

export interface SafeJsonParseResult {
  parsed: unknown | null;
  error?: ErrorInfo;
}

export const safeJsonParse = (value: string): SafeJsonParseResult => {
  try {
    return { parsed: JSON.parse(value) };
  } catch (error) {
    return {
      parsed: null,
      error: {
        code: "JSON_PARSE_ERROR",
        message: "Unable to parse response as valid JSON.",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
};
