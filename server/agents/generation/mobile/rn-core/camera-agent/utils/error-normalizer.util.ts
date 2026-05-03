import type { CameraAgentResult } from "../types.js";

export function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown camera-agent error.";
}

export function failureResult(logs: readonly string[], error: unknown): Readonly<CameraAgentResult> {
  return Object.freeze({
    success: false,
    logs: Object.freeze([...logs]),
    error: normalizeError(error),
  });
}
