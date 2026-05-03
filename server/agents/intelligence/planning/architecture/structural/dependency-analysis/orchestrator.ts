import type {
  DependencyInput,
  DependencyAnalysisResult,
  DependencySession,
} from "./types.js";
import * as state from "./state.js";

import { buildDependencyGraph }  from "./agents/graph-builder.agent.js";
import { detectCycles }          from "./agents/cycle-detector.agent.js";
import { analyzeCoupling }       from "./agents/coupling-analyzer.agent.js";
import { detectClusters }        from "./agents/cluster-detector.agent.js";
import { computeMetrics }        from "./agents/metrics-computer.agent.js";
import { isValidInput }          from "./utils/graph.util.js";

let _resultCounter = 0;

function nextResultId(): string {
  _resultCounter += 1;
  return `dep-${Date.now()}-${String(_resultCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `dsess-${Date.now()}`;
}

function createSession(
  projectId:   string,
  moduleCount: number,
): DependencySession {
  return Object.freeze({
    sessionId:   nextSessionId(),
    projectId,
    phase:       "IDLE" as const,
    startedAt:   Date.now(),
    moduleCount,
  });
}

function buildSummary(
  modules:  number,
  edges:    number,
  cycles:   number,
  health:   number,
  clusters: number,
): string {
  if (modules === 0) return "No modules provided for dependency analysis.";
  const cycleInfo = cycles > 0 ? ` ${cycles} cycle(s) detected.` : " No cycles.";
  return `${modules} modules, ${edges} dependencies, ${clusters} cluster(s).${cycleInfo} Health: ${health}/100.`;
}

function buildEmptyResult(resultId: string, nowMs: number): DependencyAnalysisResult {
  return Object.freeze({
    resultId,
    analyzedAt: nowMs,
    graph: Object.freeze({
      projectId: "unknown",
      nodes:     Object.freeze([]),
      edges:     Object.freeze([]),
    }),
    cycles:   Object.freeze([]),
    coupling: Object.freeze([]),
    clusters: Object.freeze([]),
    metrics:  Object.freeze({
      totalModules:       0,
      totalEdges:         0,
      avgFanOut:          0,
      avgFanIn:           0,
      maxFanOut:          0,
      maxFanIn:           0,
      graphDensity:       0,
      cycleCount:         0,
      modulesInCycles:    0,
      clusterCount:       0,
      avgInstability:     0,
      maxDepth:           0,
      overallHealthScore: 100,
    }),
    summary: "No modules provided for dependency analysis.",
  });
}

function buildInvalidResult(resultId: string, nowMs: number): DependencyAnalysisResult {
  return Object.freeze({
    resultId,
    analyzedAt: nowMs,
    graph: Object.freeze({
      projectId: "invalid",
      nodes:     Object.freeze([]),
      edges:     Object.freeze([]),
    }),
    cycles:   Object.freeze([]),
    coupling: Object.freeze([]),
    clusters: Object.freeze([]),
    metrics:  Object.freeze({
      totalModules:       0,
      totalEdges:         0,
      avgFanOut:          0,
      avgFanIn:           0,
      maxFanOut:          0,
      maxFanIn:           0,
      graphDensity:       0,
      cycleCount:         0,
      modulesInCycles:    0,
      clusterCount:       0,
      avgInstability:     0,
      maxDepth:           0,
      overallHealthScore: 0,
    }),
    summary: "Invalid DependencyInput — missing required fields.",
  });
}

export function analyzeDependencies(
  input: DependencyInput,
): DependencyAnalysisResult {
  const nowMs    = Date.now();
  const resultId = nextResultId();

  if (!isValidInput(input)) {
    const r = buildInvalidResult(resultId, nowMs);
    state.setLastResult(r);
    return r;
  }

  if (input.modules.length === 0) {
    const r = buildEmptyResult(resultId, nowMs);
    state.setLastResult(r);
    return r;
  }

  const session = createSession(input.projectId, input.modules.length);
  state.setSession(session);

  state.updatePhase("GRAPH_BUILDING");
  const graph = buildDependencyGraph(input);
  state.setGraph(graph);

  state.updatePhase("CYCLE_DETECTION");
  const cycles = detectCycles(graph);

  state.updatePhase("COUPLING_ANALYSIS");
  const coupling = analyzeCoupling(graph);

  state.updatePhase("CLUSTER_DETECTION");
  const clusters = detectClusters(graph);

  state.updatePhase("METRICS_COMPUTATION");
  const metrics = computeMetrics(graph, cycles, coupling, clusters);
  state.setMetrics(metrics);

  state.updatePhase("COMPLETE");
  state.markComplete();

  const result: DependencyAnalysisResult = Object.freeze({
    resultId,
    analyzedAt: nowMs,
    graph,
    cycles:     Object.freeze(cycles),
    coupling:   Object.freeze(coupling),
    clusters:   Object.freeze(clusters),
    metrics,
    summary:    buildSummary(
      graph.nodes.length,
      graph.edges.length,
      cycles.length,
      metrics.overallHealthScore,
      clusters.length,
    ),
  });

  state.setLastResult(result);
  return result;
}

export function analyzeMultiple(
  inputs: readonly DependencyInput[],
): readonly DependencyAnalysisResult[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return Object.freeze<DependencyAnalysisResult[]>([]);
  }
  return Object.freeze(inputs.map(analyzeDependencies));
}

export function getLastResult(): Readonly<DependencyAnalysisResult> | null {
  return state.getLastResult();
}

export function getResultHistory(): readonly DependencyAnalysisResult[] {
  return state.getResultHistory();
}

export function resetAnalyzer(): void {
  _resultCounter = 0;
  state.clearAll();
}
