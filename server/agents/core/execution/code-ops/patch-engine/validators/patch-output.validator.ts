import type { PatchResult, BatchPatchResult } from '../types.js';

export interface OutputValidationResult {
  readonly valid: boolean;
  readonly warnings: readonly string[];
}

export function validatePatchResult(result: PatchResult): OutputValidationResult {
  const warnings: string[] = [];

  if (result.status === 'SUCCESS') {
    if (result.patchedCode === result.originalCode) {
      warnings.push(`Patch ${result.transformationId} reported SUCCESS but code is unchanged`);
    }
    if (result.diffSummary.linesAdded === 0 && result.diffSummary.linesRemoved === 0) {
      warnings.push(`Patch ${result.transformationId} has zero diff lines despite SUCCESS status`);
    }
  }

  if (result.status === 'INVALID' && !result.reason) {
    warnings.push(`Patch ${result.transformationId} is INVALID with no reason provided`);
  }

  return { valid: warnings.length === 0, warnings: Object.freeze(warnings) };
}

export function validateBatchPatchResult(result: BatchPatchResult): OutputValidationResult {
  const warnings: string[] = [];

  if (result.results.length === 0) {
    warnings.push('Batch result contains no patch results');
  }

  const allInvalid = result.results.every((r) => r.status === 'INVALID');
  if (allInvalid && result.results.length > 0) {
    warnings.push('All patches in batch failed with INVALID status');
  }

  if (!result.finalCode || result.finalCode.trim().length === 0) {
    warnings.push('Final code is empty after batch patch');
  }

  return { valid: warnings.length === 0, warnings: Object.freeze(warnings) };
}
