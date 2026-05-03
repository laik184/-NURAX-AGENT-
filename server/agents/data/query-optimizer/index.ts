export {
  optimizeQueries,
  analyzeQuery,
  getOptimizationReport,
} from "./orchestrator.js";

export { INITIAL_STATE, transitionState } from "./state.js";

export type {
  AgentResult,
  ExecutionPlan,
  ExecutionPlanNode,
  IndexSuggestion,
  IssueSeverity,
  OptimizationIssue,
  OptimizationRecommendation,
  OptimizationReport,
  Query,
  QueryAnalysis,
  QueryOptimizerState,
  QueryOptimizerStatus,
  QueryType,
  StatePatch,
} from "./types.js";
