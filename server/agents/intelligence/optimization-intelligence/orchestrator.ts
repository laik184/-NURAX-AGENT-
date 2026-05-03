import type {
  RuntimeAnalysisInput,
  CodeStructureInput,
  OptimizationReport,
  OptimizationFinding,
} from "./types.js";
import { analyzeCpuPatterns }          from "./performance/agents/cpu-pattern.agent.js";
import { analyzeMemoryPatterns }       from "./performance/agents/memory-pattern.agent.js";
import { analyzeLatencyPatterns }      from "./performance/agents/latency-pattern.agent.js";
import { suggestAsyncRefactors }       from "./code-optimization/agents/async-suggestion.agent.js";
import { detectSyncBlocking }          from "./code-optimization/agents/sync-blocking.agent.js";
import { recommendWorkerThreads }      from "./code-optimization/agents/worker-thread.agent.js";
import { detectCachingOpportunities }  from "./code-optimization/agents/caching-opportunity.agent.js";
import { analyzePayloadOptimization }  from "./payload/agents/payload-optimizer.agent.js";
import { rankSuggestions, buildSummary } from "./ranking/impact-ranker.js";
import { resetSeq }                    from "./utils/scoring.util.js";
import * as state                      from "./state.js";

let _counter = 0;

function nextReportId(): string {
  _counter += 1;
  return `opt-${Date.now()}-${String(_counter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  _counter += 1;
  return `opt-ses-${Date.now()}-${String(_counter).padStart(4, "0")}`;
}

function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val as object);
    }
  }
  return obj as Readonly<T>;
}

function isValidRuntime(input: unknown): input is RuntimeAnalysisInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const r = input as Record<string, unknown>;
  return (
    r["memory"] != null &&
    r["cpu"]    != null &&
    Array.isArray(r["endpoints"]) &&
    Array.isArray(r["metrics"])
  );
}

function isValidCode(input: unknown): input is CodeStructureInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const r = input as Record<string, unknown>;
  return (
    Array.isArray(r["functions"]) &&
    Array.isArray(r["responses"]) &&
    Array.isArray(r["caches"])
  );
}

function buildEmptyReport(reportId: string): OptimizationReport {
  return deepFreeze({
    reportId,
    findings:          [],
    rankedSuggestions: [],
    summary: {
      totalFindings:  0,
      criticalCount:  0,
      highCount:      0,
      mediumCount:    0,
      lowCount:       0,
      topCategory:    null,
      overallScore:   0,
      priorityFocus:  "No optimization issues detected.",
    },
    analyzedAt: Date.now(),
  });
}

export function analyze(
  runtime: RuntimeAnalysisInput,
  code:    CodeStructureInput,
): OptimizationReport {
  const reportId  = nextReportId();
  const sessionId = nextSessionId();
  resetSeq();

  if (!isValidRuntime(runtime) || !isValidCode(code)) {
    return buildEmptyReport(reportId);
  }

  state.initSession(sessionId);

  // Level 2 — Performance agents
  state.advanceStage(sessionId, "PERFORMANCE");
  const perfFindings: OptimizationFinding[] = [
    ...analyzeCpuPatterns(runtime.cpu, code.functions),
    ...analyzeMemoryPatterns(runtime.memory),
    ...analyzeLatencyPatterns(runtime.endpoints, runtime.metrics),
  ];
  state.appendFindings(sessionId, perfFindings);

  // Level 2 — Code optimization agents
  state.advanceStage(sessionId, "CODE_OPTIMIZATION");
  const codeFindings: OptimizationFinding[] = [
    ...suggestAsyncRefactors(code.functions),
    ...detectSyncBlocking(code.functions, runtime.endpoints),
    ...recommendWorkerThreads(code.functions, runtime.cpu),
    ...detectCachingOpportunities(code.caches, runtime.endpoints),
  ];
  state.appendFindings(sessionId, codeFindings);

  // Level 2 — Payload agent
  state.advanceStage(sessionId, "PAYLOAD");
  const payloadFindings = analyzePayloadOptimization(code.responses);
  state.appendFindings(sessionId, payloadFindings);

  // Level 3 — Ranking
  state.advanceStage(sessionId, "RANKING");
  const allFindings    = state.getFindings(sessionId);
  const ranked         = rankSuggestions(allFindings);
  const summary        = buildSummary(allFindings);

  const report: OptimizationReport = deepFreeze({
    reportId,
    findings:          allFindings,
    rankedSuggestions: ranked,
    summary,
    analyzedAt:        Date.now(),
  });

  state.setReport(sessionId, report);
  state.clearSession(sessionId);

  return report;
}

export function analyzeRuntime(runtime: RuntimeAnalysisInput): OptimizationReport {
  return analyze(runtime, { functions: [], responses: [], caches: [] });
}

export function analyzeCode(code: CodeStructureInput): OptimizationReport {
  return analyze(
    { memory: { heapUsedMb: 0, heapTotalMb: 0, externalMb: 0, rssMb: 0 },
      cpu: { usagePercent: 0, userMs: 0, systemMs: 0 },
      endpoints: [],
      metrics:   [],
    },
    code,
  );
}

export function resetCounter(): void {
  _counter = 0;
}
