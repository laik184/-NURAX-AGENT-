import type { PatchResult, PatchType } from "../types.js";
import { hasLargeResponseObjects }   from "../utils/ast.util.js";
import {
  addPayloadFieldFilter,
  injectCompressionHint,
} from "../utils/string.util.js";
import { buildDiff }                  from "../diff.builder.js";

const PATCH_TYPE: PatchType = "PAYLOAD_OPTIMIZATION";

const RES_SEND_RE       = /\bres\s*\.\s*(?:json|send)\s*\(/;
const SPREAD_LARGE_RE   = /\.\.\.\s*\w+/g;
const STRINGIFY_RE      = /JSON\.stringify\s*\(/;
const SEND_WITH_JSON_RE = /(?:res\.send|response\.send)\s*\([^)]*\)[\s\S]*JSON\.stringify|JSON\.stringify[\s\S]*(?:res\.send|response\.send)\s*\(/;

const LARGE_PAYLOAD_HINT = [
  `// PATCH: Field Filtering applied — use _filterFields(obj, allowedFields)`,
  `// Example: res.json(_filterFields(data, ['id','name','status']))`,
  ``,
].join("\n");

function hasLargePayloadIndicators(code: string): boolean {
  SPREAD_LARGE_RE.lastIndex = 0;
  const spreadMatches = (code.match(SPREAD_LARGE_RE) ?? []).length;
  return (
    hasLargeResponseObjects(code)  ||
    SEND_WITH_JSON_RE.test(code)   ||
    (STRINGIFY_RE.test(code) && RES_SEND_RE.test(code)) ||
    (RES_SEND_RE.test(code) && spreadMatches > 2)
  );
}

function buildSkipped(id: string, originalCode: string): PatchResult {
  return Object.freeze({
    transformationId: id,
    patchType:        PATCH_TYPE,
    status:           "SKIPPED",
    originalCode,
    patchedCode:      originalCode,
    diffSummary:      buildDiff(originalCode, originalCode),
    appliedAt:        Date.now(),
    reason:           "No large payload pattern detected",
  });
}

export function applyPayloadOptimization(
  id:           string,
  originalCode: string,
): PatchResult {
  if (!hasLargePayloadIndicators(originalCode)) {
    return buildSkipped(id, originalCode);
  }

  let patchedCode = addPayloadFieldFilter(originalCode);
  patchedCode     = injectCompressionHint(patchedCode);
  patchedCode     = LARGE_PAYLOAD_HINT + patchedCode;

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
