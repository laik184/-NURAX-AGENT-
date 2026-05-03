export type QueryOptimizerStatus = "IDLE" | "ANALYZING" | "COMPLETED" | "FAILED";

export type QueryType = "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "UNKNOWN";

export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Query {
  readonly id: string;
  readonly sql: string;
  readonly executionTimeMs: number;
  readonly table?: string;
  readonly params?: readonly unknown[];
  readonly timestamp?: number;
}

export interface QueryAnalysis {
  readonly queryId: string;
  readonly normalizedSql: string;
  readonly type: QueryType;
  readonly tables: readonly string[];
  readonly hasWhere: boolean;
  readonly hasJoin: boolean;
  readonly hasOrderBy: boolean;
  readonly hasGroupBy: boolean;
  readonly hasSubquery: boolean;
  readonly estimatedCost: number;
}

export interface OptimizationIssue {
  readonly queryId: string;
  readonly type: "SLOW_QUERY" | "N_PLUS_ONE" | "MISSING_INDEX" | "FULL_TABLE_SCAN" | "CARTESIAN_JOIN";
  readonly severity: IssueSeverity;
  readonly description: string;
  readonly affectedTable?: string;
  readonly affectedColumn?: string;
}

export interface IndexSuggestion {
  readonly queryId: string;
  readonly table: string;
  readonly columns: readonly string[];
  readonly indexType: "BTREE" | "HASH" | "COMPOSITE";
  readonly rationale: string;
  readonly ddl: string;
}

export interface ExecutionPlanNode {
  readonly operation: string;
  readonly table?: string;
  readonly rows: number;
  readonly cost: number;
  readonly filter?: string;
  readonly usingIndex?: boolean;
}

export interface ExecutionPlan {
  readonly queryId: string;
  readonly nodes: readonly ExecutionPlanNode[];
  readonly totalCost: number;
  readonly fullTableScans: number;
  readonly indexScans: number;
}

export interface OptimizationRecommendation {
  readonly queryId: string;
  readonly original: string;
  readonly suggestion: string;
  readonly rationale: string;
  readonly estimatedImprovement: string;
  readonly priority: IssueSeverity;
}

export interface OptimizationReport {
  readonly success: boolean;
  readonly issues: readonly OptimizationIssue[];
  readonly suggestions: readonly OptimizationRecommendation[];
  readonly indexSuggestions: readonly IndexSuggestion[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface QueryOptimizerState {
  readonly queries: readonly Query[];
  readonly slowQueries: readonly Query[];
  readonly nPlusOneIssues: readonly OptimizationIssue[];
  readonly indexSuggestions: readonly IndexSuggestion[];
  readonly recommendations: readonly OptimizationRecommendation[];
  readonly status: QueryOptimizerStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface StatePatch {
  readonly queries?: readonly Query[];
  readonly slowQueries?: readonly Query[];
  readonly nPlusOneIssues?: readonly OptimizationIssue[];
  readonly indexSuggestions?: readonly IndexSuggestion[];
  readonly recommendations?: readonly OptimizationRecommendation[];
  readonly status?: QueryOptimizerStatus;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface AgentResult {
  readonly nextState: Readonly<QueryOptimizerState>;
  readonly output: Readonly<OptimizationReport>;
}
