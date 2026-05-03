import type { BreakingChange, ReviewDecision, RiskFinding } from "../types.js";

export function makeReviewDecision(
  risks: readonly RiskFinding[],
  breakingChanges: readonly BreakingChange[],
): ReviewDecision {
  if (breakingChanges.length > 0) return "REJECT";
  if (risks.some((risk) => risk.level === "critical")) return "REJECT";
  if (risks.some((risk) => risk.level === "medium")) return "WARN";
  return "APPROVE";
}
