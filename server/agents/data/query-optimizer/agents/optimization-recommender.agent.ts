import { transitionState } from "../state.js";
import type {
  AgentResult,
  ExecutionPlan,
  IndexSuggestion,
  OptimizationIssue,
  OptimizationRecommendation,
  QueryAnalysis,
  QueryOptimizerState,
} from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { estimateImprovement } from "../utils/cost-estimator.util.js";

const SOURCE = "optimization-recommender";

export interface OptimizationRecommenderInput {
  readonly analyses: readonly QueryAnalysis[];
  readonly issues: readonly OptimizationIssue[];
  readonly indexSuggestions: readonly IndexSuggestion[];
  readonly plans: readonly ExecutionPlan[];
  readonly state: Readonly<QueryOptimizerState>;
}

function buildRecommendation(
  analysis: QueryAnalysis,
  issues: readonly OptimizationIssue[],
  indexSuggestions: readonly IndexSuggestion[],
  plan: ExecutionPlan | undefined,
): OptimizationRecommendation | null {
  const queryIssues = issues.filter((i) => i.queryId === analysis.queryId);
  const queryIndexes = indexSuggestions.filter((s) => s.queryId === analysis.queryId);

  if (queryIssues.length === 0 && queryIndexes.length === 0) return null;

  const parts: string[] = [];

  const hasNPlusOne = queryIssues.some((i) => i.type === "N_PLUS_ONE");
  const hasFullScan = queryIssues.some((i) => i.type === "FULL_TABLE_SCAN");
  const hasCartesian = queryIssues.some((i) => i.type === "CARTESIAN_JOIN");
  const hasSlow = queryIssues.some((i) => i.type === "SLOW_QUERY");

  if (hasNPlusOne) parts.push("Batch related queries or use JOIN / eager-loading to eliminate N+1.");
  if (hasCartesian) parts.push("Add a WHERE or ON clause to prevent Cartesian product joins.");
  if (hasFullScan && queryIndexes.length > 0) {
    parts.push(`Add indexes: ${queryIndexes.map((s) => s.ddl).join(" ")}`);
  }
  if (hasSlow && !hasNPlusOne) parts.push("Profile and rewrite the query; consider pagination or covering indexes.");
  if (analysis.hasSubquery) parts.push("Replace correlated subquery with a JOIN or CTE for better performance.");
  if (analysis.hasOrderBy && !queryIndexes.some((s) => s.columns.includes("created_at"))) {
    parts.push("Index the ORDER BY column to avoid filesort.");
  }

  if (parts.length === 0) return null;

  const currentCost = plan?.totalCost ?? analysis.estimatedCost * 100;
  const proposedCost = currentCost * 0.3;
  const severity = queryIssues.reduce<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    (max, i) => {
      const order = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
      return order[i.severity] > order[max] ? i.severity : max;
    },
    "LOW",
  );

  return Object.freeze({
    queryId: analysis.queryId,
    original: analysis.normalizedSql,
    suggestion: parts.join(" "),
    rationale: queryIssues.map((i) => i.description).join("; "),
    estimatedImprovement: estimateImprovement(currentCost, proposedCost),
    priority: severity,
  });
}

export function generateRecommendations(input: OptimizationRecommenderInput): Readonly<AgentResult> {
  const { analyses, issues, indexSuggestions, plans, state } = input;

  const recommendations: OptimizationRecommendation[] = [];

  for (const analysis of analyses) {
    const plan = plans.find((p) => p.queryId === analysis.queryId);
    const rec = buildRecommendation(analysis, issues, indexSuggestions, plan);
    if (rec) recommendations.push(rec);
  }

  const log = buildLog(
    SOURCE,
    `Generated ${recommendations.length} recommendation(s) for ${analyses.length} queries`,
  );

  return {
    nextState: transitionState(state, {
      recommendations: Object.freeze(recommendations),
      status: "COMPLETED",
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      issues: Object.freeze(issues),
      suggestions: Object.freeze(recommendations),
      indexSuggestions: Object.freeze(indexSuggestions),
      logs: Object.freeze([log]),
    }),
  };
}
