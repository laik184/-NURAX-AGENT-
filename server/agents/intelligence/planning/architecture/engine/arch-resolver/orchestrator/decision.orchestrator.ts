import type { ArchitectureAnalysisReport, AnalysisViolation, Decision, DecisionPlan, PriorityLevel } from "../types.js";

function toPriority(severity: string): PriorityLevel {
  if (severity === "CRITICAL" || severity === "HIGH") return "HIGH";
  if (severity === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export function buildDecisionPlan(report: ArchitectureAnalysisReport): DecisionPlan {
  const decisions: Decision[] = report.violations.map((v: AnalysisViolation, i: number) => Object.freeze<Decision>({
    id: `decision-${v.id}-${i}`,
    violationType: v.type,
    severity: v.severity === "CRITICAL" ? 4 : v.severity === "HIGH" ? 3 : v.severity === "MEDIUM" ? 2 : 1,
    impact: 3,
    risk: 2,
    priority: toPriority(v.severity),
    strategy: "refactor",
    reason: `Address ${v.type} violation`,
  }));

  const highPriority = decisions.filter(d => d.priority === "HIGH").length;
  const mediumPriority = decisions.filter(d => d.priority === "MEDIUM").length;
  const lowPriority = decisions.filter(d => d.priority === "LOW").length;

  return Object.freeze<DecisionPlan>({
    totalIssues: decisions.length,
    highPriority,
    mediumPriority,
    lowPriority,
    decisions: Object.freeze(decisions),
  });
}
