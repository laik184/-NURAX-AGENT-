import type { QueryAnalysis } from "../types.js";

const BASE_COST = 1.0;
const JOIN_PENALTY = 2.5;
const SUBQUERY_PENALTY = 3.0;
const ORDERBY_PENALTY = 1.5;
const GROUPBY_PENALTY = 1.8;
const NO_WHERE_PENALTY = 5.0;
const SLOW_QUERY_THRESHOLD_MS = 200;
const HIGH_COST_THRESHOLD = 10.0;

export function estimateQueryCost(analysis: Omit<QueryAnalysis, "estimatedCost" | "queryId" | "normalizedSql">): number {
  let cost = BASE_COST;

  if (!analysis.hasWhere) cost += NO_WHERE_PENALTY;
  if (analysis.hasJoin) cost += JOIN_PENALTY * analysis.tables.length;
  if (analysis.hasSubquery) cost += SUBQUERY_PENALTY;
  if (analysis.hasOrderBy) cost += ORDERBY_PENALTY;
  if (analysis.hasGroupBy) cost += GROUPBY_PENALTY;

  return parseFloat(cost.toFixed(2));
}

export function isSlowQuery(executionTimeMs: number): boolean {
  return executionTimeMs >= SLOW_QUERY_THRESHOLD_MS;
}

export function isHighCost(cost: number): boolean {
  return cost >= HIGH_COST_THRESHOLD;
}

export function getSlowQueryThreshold(): number {
  return SLOW_QUERY_THRESHOLD_MS;
}

export function estimateImprovement(currentCost: number, proposedCost: number): string {
  if (currentCost <= 0) return "unknown";
  const pct = Math.round(((currentCost - proposedCost) / currentCost) * 100);
  if (pct <= 0) return "marginal";
  return `~${pct}% reduction in cost`;
}
