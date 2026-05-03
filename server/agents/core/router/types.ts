export type Intent =
  | "generate"
  | "analyze"
  | "fix"
  | "deploy"
  | "test"
  | "optimize"
  | "secure"
  | "observe"
  | "document"
  | "data"
  | "realtime"
  | "unknown";

export type Domain =
  | "generation"
  | "intelligence"
  | "infrastructure"
  | "security"
  | "observability"
  | "devops"
  | "data"
  | "realtime"
  | "core"
  | "unknown";

export interface RouterInput {
  readonly input: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly sessionId?: string;
}

export interface DetectedIntent {
  readonly intent: Intent;
  readonly keywords: readonly string[];
  readonly confidence: number;
}

export interface DomainMapping {
  readonly domain: Domain;
  readonly module: string;
  readonly reason: string;
}

export interface AgentSelection {
  readonly agent: string;
  readonly module: string;
  readonly domain: Domain;
}

export interface ConfidenceScore {
  readonly score: number;
  readonly factors: Readonly<Record<string, number>>;
}

export interface RouterResult {
  readonly success: boolean;
  readonly domain: string;
  readonly module: string;
  readonly agent: string;
  readonly confidence: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface RouteRecord {
  readonly input: string;
  readonly domain: string;
  readonly module: string;
  readonly agent: string;
  readonly confidence: number;
  readonly timestamp: number;
  readonly success: boolean;
}

export interface RouterMetrics {
  readonly totalRequests: number;
  readonly successRate: number;
  readonly avgConfidence: number;
}

export interface RouterState {
  readonly lastRoutes: readonly RouteRecord[];
  readonly failedRoutes: readonly RouteRecord[];
  readonly metrics: RouterMetrics;
}
