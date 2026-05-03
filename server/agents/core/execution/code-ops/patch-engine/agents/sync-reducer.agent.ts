import type { PatchResult, PatchType } from "../types.js";
import {
  hasSyncFsCalls,
  hasSyncCryptoCalls,
  hasSyncChildProcess,
} from "../utils/ast.util.js";
import { replaceSyncWithAsync } from "../utils/string.util.js";
import { buildDiff }            from "../diff.builder.js";

const PATCH_TYPE: PatchType = "SYNC_REDUCTION";

const REQUIRE_FS_RE   = /\brequire\s*\(\s*['"]fs['"]\s*\)/;
const REQUIRE_UTIL_RE = /\brequire\s*\(\s*['"]util['"]\s*\)/;
const EXEC_SYNC_RE    = /\bexecSync\b/;
const UTIL_IMPORT     = `const util = require('util');\nconst { exec: execAsync } = require('child_process');\n`;

function buildSkipped(id: string, originalCode: string): PatchResult {
  return Object.freeze({
    transformationId: id,
    patchType:        PATCH_TYPE,
    status:           "SKIPPED",
    originalCode,
    patchedCode:      originalCode,
    diffSummary:      buildDiff(originalCode, originalCode),
    appliedAt:        Date.now(),
    reason:           "No synchronous blocking calls detected",
  });
}

function injectImports(code: string): string {
  let header = "";

  if (hasSyncCryptoCalls(code) && !REQUIRE_UTIL_RE.test(code)) {
    header += `const util = require('util');\n`;
  }

  if (hasSyncChildProcess(code) && !EXEC_SYNC_RE.test(code)) {
    header += UTIL_IMPORT;
  }

  return header + code;
}

export function applySyncReduction(
  id:           string,
  originalCode: string,
): PatchResult {
  const hasSyncCalls =
    hasSyncFsCalls(originalCode)       ||
    hasSyncCryptoCalls(originalCode)   ||
    hasSyncChildProcess(originalCode);

  if (!hasSyncCalls) {
    return buildSkipped(id, originalCode);
  }

  const withImports = injectImports(originalCode);
  const patchedCode = replaceSyncWithAsync(withImports);

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
