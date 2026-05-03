import type { PatchRequest, BatchPatchRequest, PatchType } from "../types.js";

const VALID_PATCH_TYPES = new Set<PatchType>([
  "ASYNC_REFACTOR",
  "CACHE_INJECTION",
  "SYNC_REDUCTION",
  "WORKER_THREAD_INJECTION",
  "PAYLOAD_OPTIMIZATION",
]);

const MIN_CODE_LENGTH = 1;
const MAX_CODE_LENGTH = 200_000;

export interface ValidationResult {
  readonly valid:   boolean;
  readonly reasons: readonly string[];
}

export function validateCode(code: unknown): ValidationResult {
  const reasons: string[] = [];
  if (typeof code !== "string")            reasons.push("code must be a string");
  else if (code.trim().length < MIN_CODE_LENGTH) reasons.push("code must not be empty");
  else if (code.length > MAX_CODE_LENGTH)  reasons.push(`code must not exceed ${MAX_CODE_LENGTH} characters`);
  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function validatePatchType(patchType: unknown): ValidationResult {
  const reasons: string[] = [];
  if (typeof patchType !== "string")       reasons.push("patchType must be a string");
  else if (!VALID_PATCH_TYPES.has(patchType as PatchType))
    reasons.push(`unknown patchType: ${patchType}`);
  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function validatePatchRequest(req: unknown): ValidationResult {
  if (!req || typeof req !== "object" || Array.isArray(req)) {
    return Object.freeze({
      valid:   false,
      reasons: Object.freeze(["request must be a non-null object"]),
    });
  }
  const r = req as Record<string, unknown>;
  const reasons: string[] = [];
  const codeV = validateCode(r["code"]);
  if (!codeV.valid) reasons.push(...codeV.reasons);
  const typeV = validatePatchType(r["patchType"]);
  if (!typeV.valid) reasons.push(...typeV.reasons);
  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function validateBatchRequest(req: unknown): ValidationResult {
  if (!req || typeof req !== "object" || Array.isArray(req)) {
    return Object.freeze({
      valid:   false,
      reasons: Object.freeze(["batch request must be a non-null object"]),
    });
  }
  const r = req as Record<string, unknown>;
  const reasons: string[] = [];
  const codeV = validateCode(r["code"]);
  if (!codeV.valid) reasons.push(...codeV.reasons);
  if (!Array.isArray(r["patchTypes"]) || r["patchTypes"].length === 0)
    reasons.push("patchTypes must be a non-empty array");
  else {
    for (const pt of r["patchTypes"] as unknown[]) {
      const tv = validatePatchType(pt);
      if (!tv.valid) reasons.push(...tv.reasons);
    }
  }
  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
