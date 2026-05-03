import type {
  PatchRequest,
  PatchResult,
  BatchPatchRequest,
  BatchPatchResult,
  PatchType,
} from "./types.js";
import { validatePatchRequest, validateBatchRequest } from "./utils/validation.util.js";
import { applyAsyncRefactor }         from "./agents/async-refactor.agent.js";
import { applyCacheInjection }        from "./agents/cache-injector.agent.js";
import { applySyncReduction }         from "./agents/sync-reducer.agent.js";
import { applyWorkerThreadInjection } from "./agents/worker-thread-injector.agent.js";
import { applyPayloadOptimization }   from "./agents/payload-optimizer.agent.js";
import { buildDiff }                  from "./diff.builder.js";
import * as state                     from "./state.js";

let _counter = 0;

function nextId(patchType: PatchType): string {
  _counter += 1;
  return `ptch-${patchType.toLowerCase().replace(/_/g, "-")}-${Date.now()}-${String(_counter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  _counter += 1;
  return `ses-${Date.now()}-${String(_counter).padStart(4, "0")}`;
}

function buildInvalidResult(
  id:           string,
  patchType:    PatchType,
  originalCode: string,
  reason:       string,
): PatchResult {
  return Object.freeze({
    transformationId: id,
    patchType,
    status:           "INVALID",
    originalCode,
    patchedCode:      originalCode,
    diffSummary:      buildDiff(originalCode, originalCode),
    appliedAt:        Date.now(),
    reason,
  });
}

function dispatchPatch(
  id:          string,
  code:        string,
  patchType:   PatchType,
  targetHint:  string | null,
): PatchResult {
  switch (patchType) {
    case "ASYNC_REFACTOR":
      return applyAsyncRefactor(id, code);
    case "CACHE_INJECTION":
      return applyCacheInjection(id, code, targetHint);
    case "SYNC_REDUCTION":
      return applySyncReduction(id, code);
    case "WORKER_THREAD_INJECTION":
      return applyWorkerThreadInjection(id, code);
    case "PAYLOAD_OPTIMIZATION":
      return applyPayloadOptimization(id, code);
    default: {
      const exhaustive: never = patchType;
      return buildInvalidResult(id, exhaustive, code, `Unknown patchType: ${String(exhaustive)}`);
    }
  }
}

export function applyPatch(request: PatchRequest): PatchResult {
  const validation = validatePatchRequest(request);
  if (!validation.valid) {
    const id = nextId(request?.patchType ?? "ASYNC_REFACTOR");
    return buildInvalidResult(
      id,
      request?.patchType ?? "ASYNC_REFACTOR",
      request?.code      ?? "",
      validation.reasons.join("; "),
    );
  }

  const id     = nextId(request.patchType);
  const result = dispatchPatch(id, request.code, request.patchType, request.targetHint);

  return result;
}

export function applyBatchPatch(request: BatchPatchRequest): BatchPatchResult {
  const sessionId  = nextSessionId();
  const validation = validateBatchRequest(request);

  if (!validation.valid) {
    return Object.freeze({
      sessionId,
      results:   Object.freeze([]),
      finalCode: request?.code ?? "",
      appliedAt: Date.now(),
    });
  }

  state.initSession(sessionId, request.code);

  let currentCode    = request.code;
  const results: PatchResult[] = [];

  for (const patchType of request.patchTypes) {
    const id     = nextId(patchType);
    const result = dispatchPatch(id, currentCode, patchType, null);

    state.recordPatch(sessionId, result);
    results.push(result);

    if (result.status === "SUCCESS") {
      currentCode = result.patchedCode;
    }
  }

  state.completeSession(sessionId);
  state.clearSession(sessionId);

  return Object.freeze({
    sessionId,
    results:   Object.freeze(results),
    finalCode: currentCode,
    appliedAt: Date.now(),
  });
}

export function getHistory() {
  return state.getHistory();
}

export function resetCounter(): void {
  _counter = 0;
}
