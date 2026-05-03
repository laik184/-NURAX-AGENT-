export type DecisionSource =
  | "self-improvement"
  | "priority-engine"
  | "decision-engine"
  | "recovery"
  | "router"
  | "planning"
  | "external";

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type DecisionAction =
  | "execute"
  | "retry"
  | "defer"
  | "abort"
  | "escalate"
  | "cache"
  | "refactor"
  | "optimize";

export interface Decision {
  id: string;
  source: DecisionSource;
  action: DecisionAction;
  target: string;
  payload: Readonly<Record<string, unknown>>;
  confidence: number;
  priority: number;
  riskLevel: RiskLevel;
  isDestructive: boolean;
  timestamp: number;
  metadata: Readonly<Record<string, unknown>>;
}

export interface NormalizedDecision extends Decision {
  normalizedConfidence: number;
  normalizedPriority: number;
}

export interface Conflict {
  id: string;
  decisionIds: [string, string];
  type: "action-clash" | "target-clash" | "priority-clash" | "risk-clash";
  description: string;
  severity: "low" | "medium" | "high";
}

export interface EvaluationScore {
  decisionId: string;
  priorityScore: number;
  riskScore: number;
  confidenceScore: number;
  compositeScore: number;
}

export interface GovernorInput {
  sessionId: string;
  decisions: Decision[];
  allowDestructive?: boolean;
  minConfidenceThreshold?: number;
  context?: Readonly<Record<string, unknown>>;
}

export interface GovernorOutput {
  success: boolean;
  logs: string[];
  error?: string;
  data?: {
    sessionId: string;
    finalDecision: Decision;
    conflicts: Conflict[];
    scores: EvaluationScore[];
    blockedDecisions: string[];
    rationale: string;
    resolvedAt: number;
  };
}
