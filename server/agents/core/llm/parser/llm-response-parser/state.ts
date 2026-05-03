import type { ParseResult } from "./types";

export const createInitialParseState = (rawResponse = ""): ParseResult => ({
  rawResponse,
  parsedOutput: null,
  detectedType: "unknown",
  errors: [],
  logs: [],
  status: "IDLE",
});
