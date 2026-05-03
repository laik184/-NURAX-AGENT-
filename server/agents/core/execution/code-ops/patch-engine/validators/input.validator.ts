import type { BatchPatchRequest, PatchRequest, PatchType } from '../types.js';

const VALID_PATCH_TYPES = new Set<PatchType>([
  'ASYNC_REFACTOR',
  'CACHE_INJECTION',
  'SYNC_REDUCTION',
  'WORKER_THREAD_INJECTION',
  'PAYLOAD_OPTIMIZATION',
]);

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validatePatchRequest(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be a non-null object'] };
  }

  const req = input as Record<string, unknown>;

  if (typeof req.code !== 'string' || req.code.trim().length === 0) {
    errors.push('code must be a non-empty string');
  }

  if (!VALID_PATCH_TYPES.has(req.patchType as PatchType)) {
    errors.push(`patchType must be one of: ${[...VALID_PATCH_TYPES].join(', ')}`);
  }

  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}

export function validateBatchPatchRequest(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be a non-null object'] };
  }

  const req = input as Record<string, unknown>;

  if (typeof req.code !== 'string' || req.code.trim().length === 0) {
    errors.push('code must be a non-empty string');
  }

  if (!Array.isArray(req.patchTypes) || req.patchTypes.length === 0) {
    errors.push('patchTypes must be a non-empty array');
  } else {
    const invalid = (req.patchTypes as unknown[]).filter(
      (t) => !VALID_PATCH_TYPES.has(t as PatchType),
    );
    if (invalid.length > 0) {
      errors.push(`Invalid patchTypes: ${invalid.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}
