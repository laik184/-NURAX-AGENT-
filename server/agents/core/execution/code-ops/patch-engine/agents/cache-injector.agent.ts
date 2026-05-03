import type { PatchResult, PatchType } from "../types.js";
import { hasJsonParse }              from "../utils/ast.util.js";
import { wrapInCacheLayer }          from "../utils/string.util.js";
import { buildDiff }                 from "../diff.builder.js";

const PATCH_TYPE: PatchType = "CACHE_INJECTION";
const DEFAULT_TTL_MS        = 60_000;
const FETCH_RE              = /\bfetch\s*\(|axios\s*\.\s*(?:get|post|put|delete)\s*\(|http\.(?:get|request)\s*\(/;
const DB_QUERY_RE           = /\b(?:query|findOne|findAll|find|select|execute)\s*\(/;
const REPEATED_COMPUTE_RE   = /for\s*\(.*\)\s*\{[\s\S]*?(?:compute|calculate|transform|process)\s*\(/;

function hasCacheablePattern(code: string): boolean {
  return (
    FETCH_RE.test(code)            ||
    DB_QUERY_RE.test(code)         ||
    hasJsonParse(code)             ||
    REPEATED_COMPUTE_RE.test(code)
  );
}

function deriveCacheKey(code: string, hint: string | null): string {
  if (hint) return hint.replace(/[^a-zA-Z0-9_-]/g, "_");

  if (FETCH_RE.test(code))        return "http_response_cache";
  if (DB_QUERY_RE.test(code))     return "db_query_cache";
  if (hasJsonParse(code))         return "parsed_json_cache";
  return "computed_result_cache";
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
    reason:           "No cacheable pattern detected",
  });
}

export function applyCacheInjection(
  id:           string,
  originalCode: string,
  targetHint:   string | null = null,
): PatchResult {
  if (!hasCacheablePattern(originalCode)) {
    return buildSkipped(id, originalCode);
  }

  const cacheKey   = deriveCacheKey(originalCode, targetHint);
  const patchedCode = wrapInCacheLayer(originalCode, cacheKey, DEFAULT_TTL_MS);

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
