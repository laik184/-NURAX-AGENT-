import type { NetworkError } from "../types.js";

export function normalizeError(error: unknown, fallbackCode = "NETWORK_ERROR"): NetworkError {
  if (typeof error === "object" && error !== null) {
    const statusCode = "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;

    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "Unknown networking error";

    const code = "code" in error && typeof error.code === "string"
      ? error.code
      : fallbackCode;

    return Object.freeze({
      code,
      message,
      statusCode,
      details: error,
      retryable: statusCode !== undefined ? statusCode >= 500 : true,
    });
  }

  return Object.freeze({
    code: fallbackCode,
    message: typeof error === "string" ? error : "Unknown networking error",
    retryable: true,
  });
}
