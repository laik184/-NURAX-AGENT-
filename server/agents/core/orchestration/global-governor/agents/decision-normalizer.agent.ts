import type { Decision, NormalizedDecision } from "../types";
import { clamp, normalizeToUnit } from "../utils/scoring.util";
import { logEntry, logDecision } from "../utils/logger.util";

export interface DecisionNormalizerOutput {
  success: boolean;
  logs: string[];
  error?: string;
  normalized?: NormalizedDecision[];
}

const VALID_ACTIONS = new Set([
  "execute", "retry", "defer", "abort", "escalate", "cache", "refactor", "optimize",
]);

const VALID_SOURCES = new Set([
  "self-improvement", "priority-engine", "decision-engine",
  "recovery", "router", "planning", "external",
]);

function coerceRiskLevel(raw: unknown): Decision["riskLevel"] {
  const valid = new Set(["none", "low", "medium", "high", "critical"]);
  if (typeof raw === "string" && valid.has(raw)) return raw as Decision["riskLevel"];
  return "medium";
}

function coerceAction(raw: unknown): Decision["action"] {
  if (typeof raw === "string" && VALID_ACTIONS.has(raw)) return raw as Decision["action"];
  return "execute";
}

function coerceSource(raw: unknown): Decision["source"] {
  if (typeof raw === "string" && VALID_SOURCES.has(raw)) return raw as Decision["source"];
  return "external";
}

export function normalizeDecisions(decisions: Decision[]): DecisionNormalizerOutput {
  const logs: string[] = [];

  try {
    if (!Array.isArray(decisions) || decisions.length === 0) {
      return { success: false, logs, error: "No decisions provided to normalize" };
    }

    logs.push(logEntry("decision-normalizer", `normalizing ${decisions.length} decision(s)`));

    const allPriorities = decisions.map((d) => (typeof d.priority === "number" ? d.priority : 0));
    const minP = Math.min(...allPriorities);
    const maxP = Math.max(...allPriorities);

    const normalized: NormalizedDecision[] = decisions.map((d) => {
      const id = typeof d.id === "string" && d.id.trim() ? d.id.trim() : `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const confidence = clamp(typeof d.confidence === "number" ? d.confidence : 0.5);
      const priority = typeof d.priority === "number" ? Math.max(0, d.priority) : 50;
      const normalizedConfidence = confidence;
      const normalizedPriority = normalizeToUnit(priority, minP, maxP);

      const nd: NormalizedDecision = {
        id,
        source: coerceSource(d.source),
        action: coerceAction(d.action),
        target: typeof d.target === "string" && d.target.trim() ? d.target.trim() : "unknown",
        payload: typeof d.payload === "object" && d.payload !== null ? d.payload : Object.freeze({}),
        confidence,
        priority,
        riskLevel: coerceRiskLevel(d.riskLevel),
        isDestructive: typeof d.isDestructive === "boolean" ? d.isDestructive : false,
        timestamp: typeof d.timestamp === "number" ? d.timestamp : Date.now(),
        metadata: typeof d.metadata === "object" && d.metadata !== null ? d.metadata : Object.freeze({}),
        normalizedConfidence,
        normalizedPriority,
      };

      logs.push(logDecision("decision-normalizer", nd.id, `source=${nd.source} action=${nd.action} confidence=${nd.confidence} priority=${nd.priority} risk=${nd.riskLevel} destructive=${nd.isDestructive}`));
      return nd;
    });

    logs.push(logEntry("decision-normalizer", `normalized ${normalized.length} decision(s) successfully`));
    return { success: true, logs, normalized };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("decision-normalizer", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
