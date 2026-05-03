import { logError } from "../utils/logger.util.js";

export function normalizeApiError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown API error";
}

export function buildErrorHelper(): string {
  return `export const normalizeClientError = (error: unknown): { success: false; status: number; data: null; error: string } => {\n  const message = error instanceof Error ? error.message : \"Unknown API error\";\n  return { success: false, status: 500, data: null, error: message };\n};`;
}

export function toErrorLog(message: string): string {
  return logError(message);
}
