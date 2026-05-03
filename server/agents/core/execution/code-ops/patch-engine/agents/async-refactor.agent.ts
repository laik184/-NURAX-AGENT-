import type { PatchResult, PatchType } from "../types.js";
import {
  isAlreadyAsync,
  hasCallbacks,
  hasPromiseChains,
  hasSyncBlockingCalls,
} from "../utils/ast.util.js";
import {
  replaceSyncWithAsync,
  ensureAsyncKeyword,
} from "../utils/string.util.js";
import { buildDiff } from "../diff.builder.js";

const PATCH_TYPE: PatchType = "ASYNC_REFACTOR";

function buildSkipped(
  id:           string,
  originalCode: string,
): PatchResult {
  return Object.freeze({
    transformationId: id,
    patchType:        PATCH_TYPE,
    status:           "SKIPPED",
    originalCode,
    patchedCode:      originalCode,
    diffSummary:      buildDiff(originalCode, originalCode),
    appliedAt:        Date.now(),
    reason:           "No async refactor target found",
  });
}

function applyRefactor(code: string): string {
  let patched = replaceSyncWithAsync(code);

  if (hasCallbacks(code)) {
    patched = patched.replace(
      /function\s+(\w+)\s*\(([^)]*),\s*callback\s*\)\s*\{/g,
      "async function $1($2) {",
    );
  }

  if (hasPromiseChains(code)) {
    patched = patched
      .replace(
        /(\w+)\s*\.\s*then\s*\(\s*(?:async\s+)?(?:function\s*)?\(([^)]*)\)\s*\{([^}]+)\}\s*\)/g,
        "await $1",
      );
  }

  patched = ensureAsyncKeyword(patched);
  return patched;
}

export function applyAsyncRefactor(
  id:          string,
  originalCode: string,
): PatchResult {
  const needsWork =
    hasSyncBlockingCalls(originalCode) ||
    hasCallbacks(originalCode)         ||
    hasPromiseChains(originalCode);

  if (!needsWork || isAlreadyAsync(originalCode)) {
    return buildSkipped(id, originalCode);
  }

  const patchedCode = applyRefactor(originalCode);

  if (patchedCode === originalCode) {
    return buildSkipped(id, originalCode);
  }

  return Object.freeze({
    transformationId: id,
    patchType:        PATCH_TYPE,
    status:           "SUCCESS",
    originalCode,
    patchedCode,
    diffSummary:      buildDiff(originalCode, patchedCode),
    appliedAt:        Date.now(),
    reason:           null,
  });
}
