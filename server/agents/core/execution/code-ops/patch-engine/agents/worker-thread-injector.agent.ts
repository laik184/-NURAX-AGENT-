import type { PatchResult, PatchType } from "../types.js";
import { hasHeavyLoops, hasSyncCryptoCalls } from "../utils/ast.util.js";
import { wrapInWorkerThread }                from "../utils/string.util.js";
import { buildDiff }                         from "../diff.builder.js";

const PATCH_TYPE: PatchType   = "WORKER_THREAD_INJECTION";
const MIN_CODE_LINES          = 3;

const REGEX_INTENSIVE_RE      = /new\s+RegExp\s*\(|(?:\.match|\.replace|\.search)\s*\(\s*\/[^/]+\/[gimsuy]*/;
const IMAGE_PROCESS_RE        = /(?:sharp|jimp|canvas|imagemagick|gm)\s*[.(]/i;
const JSON_PARSE_LARGE_RE     = /JSON\.parse\s*\(|JSON\.stringify\s*\(/;
const HEAVY_MATH_RE           = /Math\.(?:pow|sqrt|log|sin|cos|tan|atan2)\s*\(|bigint|BigInt/;

function isHeavyComputeTarget(code: string): boolean {
  return (
    hasHeavyLoops(code)          ||
    hasSyncCryptoCalls(code)     ||
    REGEX_INTENSIVE_RE.test(code)||
    IMAGE_PROCESS_RE.test(code)  ||
    JSON_PARSE_LARGE_RE.test(code) ||
    HEAVY_MATH_RE.test(code)
  );
}

const WORKER_THREADS_RE = /worker_threads/;

function buildSkipped(id: string, originalCode: string): PatchResult {
  return Object.freeze({
    transformationId: id,
    patchType:        PATCH_TYPE,
    status:           "SKIPPED",
    originalCode,
    patchedCode:      originalCode,
    diffSummary:      buildDiff(originalCode, originalCode),
    appliedAt:        Date.now(),
    reason:           "No heavy compute pattern detected for worker thread injection",
  });
}

export function applyWorkerThreadInjection(
  id:           string,
  originalCode: string,
): PatchResult {
  const lineCount = originalCode.split("\n").length;

  if (lineCount < MIN_CODE_LINES) {
    return buildSkipped(id, originalCode);
  }

  if (WORKER_THREADS_RE.test(originalCode)) {
    return Object.freeze({
      transformationId: id,
      patchType:        PATCH_TYPE,
      status:           "SKIPPED",
      originalCode,
      patchedCode:      originalCode,
      diffSummary:      buildDiff(originalCode, originalCode),
      appliedAt:        Date.now(),
      reason:           "Worker thread already present",
    });
  }

  if (!isHeavyComputeTarget(originalCode)) {
    return buildSkipped(id, originalCode);
  }

  const patchedCode = wrapInWorkerThread(originalCode);

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
