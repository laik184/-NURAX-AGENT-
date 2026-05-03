import { transitionState } from "../state.js";
import type {
  AgentResult,
  ExecutionPlan,
  ExecutionPlanNode,
  OptimizationIssue,
  QueryAnalysis,
  QueryOptimizerState,
} from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { isHighCost } from "../utils/cost-estimator.util.js";

const SOURCE = "execution-plan-analyzer";

export interface ExecutionPlanAnalyzerInput {
  readonly analyses: readonly QueryAnalysis[];
  readonly state: Readonly<QueryOptimizerState>;
}

export interface ExecutionPlanAnalyzerOutput extends AgentResult {
  readonly plans: readonly ExecutionPlan[];
  readonly planIssues: readonly OptimizationIssue[];
}

function buildPlanFromAnalysis(analysis: QueryAnalysis): ExecutionPlan {
  const nodes: ExecutionPlanNode[] = [];

  for (const table of analysis.tables) {
    const usingIndex = analysis.hasWhere;
    const rows = usingIndex ? 10 : 10000;
    const cost = usingIndex ? 1.5 : analysis.estimatedCost * 100;

    nodes.push(
      Object.freeze({
        operation: usingIndex ? "INDEX SCAN" : "SEQ SCAN",
        table,
        rows,
        cost,
        filter: analysis.hasWhere ? "WHERE predicate" : undefined,
        usingIndex,
      }),
    );

    if (analysis.hasJoin) {
      nodes.push(
        Object.freeze({
          operation: "HASH JOIN",
          table,
          rows: rows * 2,
          cost: cost * 1.5,
          usingIndex: false,
        }),
      );
    }
  }

  const totalCost = nodes.reduce((sum, n) => sum + n.cost, 0);
  const fullTableScans = nodes.filter((n) => n.operation === "SEQ SCAN").length;
  const indexScans = nodes.filter((n) => n.usingIndex).length;

  return Object.freeze({
    queryId: analysis.queryId,
    nodes: Object.freeze(nodes),
    totalCost: parseFloat(totalCost.toFixed(2)),
    fullTableScans,
    indexScans,
  });
}

export function analyzeExecutionPlans(input: ExecutionPlanAnalyzerInput): Readonly<ExecutionPlanAnalyzerOutput> {
  const { analyses, state } = input;

  if (analyses.length === 0) {
    const log = buildLog(SOURCE, "no analyses provided");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, issues: [], suggestions: [], indexSuggestions: [], logs: [log] }),
      plans: Object.freeze([]),
      planIssues: Object.freeze([]),
    };
  }

  const plans = analyses.map(buildPlanFromAnalysis);

  const planIssues: OptimizationIssue[] = [];

  for (const plan of plans) {
    if (plan.fullTableScans > 0) {
      planIssues.push(
        Object.freeze({
          queryId: plan.queryId,
          type: "FULL_TABLE_SCAN" as const,
          severity: plan.fullTableScans > 2 ? ("CRITICAL" as const) : ("HIGH" as const),
          description: `${plan.fullTableScans} full table scan(s) detected. Add indexes or WHERE clauses.`,
        }),
      );
    }

    const analysis = analyses.find((a) => a.queryId === plan.queryId);
    if (analysis && isHighCost(plan.totalCost / 100)) {
      planIssues.push(
        Object.freeze({
          queryId: plan.queryId,
          type: "FULL_TABLE_SCAN" as const,
          severity: "HIGH" as const,
          description: `Estimated execution cost is high: ${plan.totalCost.toFixed(2)} units.`,
        }),
      );
    }

    if (analysis?.hasJoin && !analysis.hasWhere) {
      planIssues.push(
        Object.freeze({
          queryId: plan.queryId,
          type: "CARTESIAN_JOIN" as const,
          severity: "CRITICAL" as const,
          description: "JOIN without WHERE condition risks a Cartesian product.",
        }),
      );
    }
  }

  const totalScans = plans.reduce((s, p) => s + p.fullTableScans, 0);
  const log = buildLog(
    SOURCE,
    `Analyzed ${plans.length} execution plan(s): ${totalScans} full table scan(s), ${planIssues.length} issue(s)`,
  );

  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({
      success: true,
      issues: Object.freeze(planIssues),
      suggestions: Object.freeze([]),
      indexSuggestions: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
    plans: Object.freeze(plans),
    planIssues: Object.freeze(planIssues),
  };
}
