import type {
  ArchitectureGraph,
  BoundaryReport,
  BoundarySession,
} from "./types.js";
import * as state from "./state.js";

import { validateLayerBoundaries }
  from "./agents/layer-boundary.validator.agent.js";
import { validateDependencyDirections }
  from "./agents/dependency-direction.validator.agent.js";
import { detectDomainLeakage }
  from "./agents/domain-leakage.detector.agent.js";
import { compileReport }
  from "./agents/violation-reporter.agent.js";
import { isValidGraph } from "./utils/graph.util.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `boundary-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `bsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): BoundaryReport {
  return Object.freeze({
    reportId,
    analyzedAt:      nowMs,
    totalNodes:      0,
    totalEdges:      0,
    totalViolations: 0,
    violations:      Object.freeze([]),
    criticalCount:   0,
    highCount:       0,
    mediumCount:     0,
    lowCount:        0,
    overallScore:    100,
    isCompliant:     true,
    summary:         "No architecture graph provided.",
  });
}

function buildInvalidReport(reportId: string, nowMs: number): BoundaryReport {
  return Object.freeze({
    reportId,
    analyzedAt:      nowMs,
    totalNodes:      0,
    totalEdges:      0,
    totalViolations: 0,
    violations:      Object.freeze([]),
    criticalCount:   0,
    highCount:       0,
    mediumCount:     0,
    lowCount:        0,
    overallScore:    0,
    isCompliant:     false,
    summary:         "Invalid ArchitectureGraph — missing required fields.",
  });
}

function createSession(
  projectId: string,
  nodeCount: number,
  edgeCount: number,
): BoundarySession {
  return Object.freeze({
    sessionId: nextSessionId(),
    projectId,
    phase:     "IDLE" as const,
    startedAt: Date.now(),
    nodeCount,
    edgeCount,
  });
}

export function analyzeBoundaries(
  graph: ArchitectureGraph,
): BoundaryReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidGraph(graph)) {
    const r = buildInvalidReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const { nodes, edges, projectId } = graph;

  if (nodes.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(projectId, nodes.length, edges.length);
  state.setSession(session);

  state.updatePhase("LAYER_VALIDATION");
  const layerResult = validateLayerBoundaries(graph);

  state.updatePhase("DIRECTION_VALIDATION");
  const dirResult = validateDependencyDirections(graph);

  state.updatePhase("DOMAIN_LEAKAGE_DETECTION");
  const domainResult = detectDomainLeakage(graph);

  state.setIntermediateViolations(Object.freeze({
    layer:     layerResult.violations,
    direction: dirResult.violations,
    domain:    domainResult.violations,
    builtAt:   Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileReport(
    reportId,
    nowMs,
    nodes.length,
    edges.length,
    layerResult.violations,
    dirResult.violations,
    domainResult.violations,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeMultiple(
  graphs: readonly ArchitectureGraph[],
): readonly BoundaryReport[] {
  if (!Array.isArray(graphs) || graphs.length === 0) {
    return Object.freeze<BoundaryReport[]>([]);
  }
  return Object.freeze(graphs.map(analyzeBoundaries));
}

export function getLastReport(): Readonly<BoundaryReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly BoundaryReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
