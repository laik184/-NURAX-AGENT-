import { RecoveryInput, DetectedError } from "../types";
import { parseError } from "../utils/error-parser.util";

const NULL_ERROR_PATTERNS = [
  /^no error$/i,
  /^(ok|success|done|complete)$/i,
  /^null$/i,
];

export function detectError(input: RecoveryInput): DetectedError {
  const raw = input.error instanceof Error ? input.error : String(input.error);
  const message = typeof raw === "string" ? raw.trim() : (raw as Error).message.trim();

  if (!message || message.length === 0 || NULL_ERROR_PATTERNS.some((p) => p.test(message))) {
    return Object.freeze({
      message: "",
      hasError: false,
    });
  }

  const parsed = parseError(input.error);

  return Object.freeze({
    message: parsed.message,
    stack: parsed.stack.join("\n"),
    hasError: true,
    ...(parsed.errorCode ? { errorCode: parsed.errorCode } : {}),
  });
}
