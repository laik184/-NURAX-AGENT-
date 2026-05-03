import type { NetworkError } from "../types.js";
import { normalizeError } from "../utils/error-normalizer.util.js";

export function handleApiError(error: unknown): NetworkError {
  return normalizeError(error, "RETROFIT_API_ERROR");
}
