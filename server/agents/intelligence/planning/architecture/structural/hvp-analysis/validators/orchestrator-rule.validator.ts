import type {
  FileNode,
  LayerDefinition,
  Violation,
  ValidatorResult,
} from "../types.js";
import { buildImportGraph } from "../utils/import-graph.builder.util.js";
import type { ImportEdge }  from "../types.js";

const VALIDATOR_NAME = "orchestrator-rule";

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `orv-${String(_idCounter).padStart(4, "0")}`;
}
export function resetOrchestratorCounter(): void { _idCounter = 0; }

function bypassViolation(edge: Readonly<ImportEdge>): Violation {
  return Object.freeze({
    id:           nextId(),
    type:         "ORCHESTRATOR_BYPASS" as const,
    severity:     "CRITICAL" as const,
    file:         edge.from,
    importedFile: edge.to,
    message:      `Orchestrator bypass: non-orchestrator '${edge.from}' (role: ${edge.fromRole}) imports orchestrator '${edge.to}'`,
    rule:         "Only index.ts or another orchestrator may import an orchestrator. Domain agents must not.",
    evidence:     Object.freeze([
      `importer: ${edge.from} (role: ${edge.fromRole}, layer: ${edge.fromLayer})`,
      `imported: ${edge.to}  (role: orchestrator,    layer: ${edge.toLayer})`,
      `fix: remove this import or promote ${edge.from} to an orchestrator`,
    ]),
  });
}

function agentToAgentViolation(edge: Readonly<ImportEdge>): Violation {
  return Object.freeze({
    id:           nextId(),
    type:         "ORCHESTRATOR_BYPASS" as const,
    severity:     "HIGH" as const,
    file:         edge.from,
    importedFile: edge.to,
    message:      `Agent-to-agent import: '${edge.from}' directly imports '${edge.to}' — only orchestrators may coordinate agents`,
    rule:         "Agents and services must not import each other; use orchestrator to coordinate.",
    evidence:     Object.freeze([
      `importer: ${edge.from} (role: ${edge.fromRole})`,
      `imported: ${edge.to}  (role: ${edge.toRole})`,
      `fix: route coordination through the orchestrator`,
    ]),
  });
}

export function validateOrchestratorRules(
  files:       readonly FileNode[],
  definitions: readonly LayerDefinition[],
  startMs:     number = Date.now(),
): ValidatorResult {
  if (!Array.isArray(files) || files.length === 0) {
    return Object.freeze({
      validatorName: VALIDATOR_NAME,
      violations:    Object.freeze([]),
      checkedFiles:  0,
      durationMs:    Date.now() - startMs,
    });
  }

  const graph      = buildImportGraph(files, definitions);
  const violations: Violation[] = [];

  for (const edge of graph.edges) {
    const fromIsOrchestrator = edge.fromRole === "orchestrator" || edge.fromRole === "index";
    const toIsOrchestrator   = edge.toRole   === "orchestrator";

    if (toIsOrchestrator && !fromIsOrchestrator) {
      violations.push(bypassViolation(edge));
      continue;
    }

    const fromIsAgent = edge.fromRole === "agent" || edge.fromRole === "service" || edge.fromRole === "validator";
    const toIsAgent   = edge.toRole   === "agent" || edge.toRole   === "service" || edge.toRole   === "validator";

    if (fromIsAgent && toIsAgent && edge.from !== edge.to) {
      violations.push(agentToAgentViolation(edge));
    }
  }

  return Object.freeze({
    validatorName: VALIDATOR_NAME,
    violations:    Object.freeze(violations),
    checkedFiles:  files.length,
    durationMs:    Date.now() - startMs,
  });
}
