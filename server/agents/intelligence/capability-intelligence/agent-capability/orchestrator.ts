import type { CapabilityInput, AgentCapabilityMatrix } from "./types.js";

import { scanRegistry }    from "./agents/registry-scanner.agent.js";
import { evaluateStatus }  from "./agents/status-evaluator.agent.js";
import { mapVersions }     from "./agents/version-mapper.agent.js";
import { buildMatrix }     from "./agents/capability-builder.agent.js";
import { resetCounters }   from "./utils/id.util.js";
import {
  createSession,
  advanceStage,
  completeSession,
  failSession,
  storeMatrix,
  getLatestMatrix,
  getMatrixHistory,
  clearAll,
} from "./state.js";

export { getLatestMatrix, getMatrixHistory, clearAll };

function isValidInput(input: unknown): input is CapabilityInput {
  if (!input || typeof input !== "object") return false;
  const i = input as Record<string, unknown>;
  return Array.isArray(i["agents"]);
}

function emptyMatrix(projectId: string): AgentCapabilityMatrix {
  return Object.freeze({
    matrixId:      `acm-invalid-${Date.now()}`,
    generatedAt:   Date.now(),
    totalAgents:   0,
    activeCount:   0,
    inactiveCount: 0,
    capabilities:  Object.freeze([]),
    byType:        Object.freeze({}),
    summary:       `Invalid input: cannot build capability matrix for "${projectId}".`,
  });
}

export function buildCapabilityMatrix(
  input: CapabilityInput,
): AgentCapabilityMatrix {
  if (!isValidInput(input)) {
    const m = emptyMatrix("UNKNOWN");
    storeMatrix(m);
    return m;
  }

  const context = input.scanContext ?? "default";
  const session = createSession(context);

  try {
    advanceStage("SCANNING");
    const scans    = scanRegistry(input);

    advanceStage("EVALUATING");
    const statuses = evaluateStatus(scans);

    advanceStage("MAPPING");
    const versions = mapVersions(scans);

    advanceStage("BUILDING");
    const matrix   = buildMatrix(scans, statuses, versions);

    completeSession();
    storeMatrix(matrix);
    return matrix;

  } catch {
    failSession();
    const m = emptyMatrix(session.sessionId);
    storeMatrix(m);
    return m;
  }
}

export function buildMany(
  inputs: readonly CapabilityInput[],
): readonly AgentCapabilityMatrix[] {
  if (!Array.isArray(inputs)) return Object.freeze([]);
  return Object.freeze(inputs.map((i) => buildCapabilityMatrix(i)));
}

export function resetOrchestrator(): void {
  resetCounters();
  clearAll();
}
