import type { ApiResponse } from "../types.js";

export function normalizeApiResponse<T>(
  status: number,
  payload: T,
): ApiResponse<T> {
  return Object.freeze({
    success: status >= 200 && status < 300,
    status,
    data: payload,
    error: null,
  });
}

export function buildResponseHelper(): string {
  return `export const unwrapResponseData = <T>(response: { data?: T; status: number }): { success: boolean; status: number; data: T | null; error: string | null } => ({\n  success: response.status >= 200 && response.status < 300,\n  status: response.status,\n  data: response.data ?? null,\n  error: null\n});`;
}
