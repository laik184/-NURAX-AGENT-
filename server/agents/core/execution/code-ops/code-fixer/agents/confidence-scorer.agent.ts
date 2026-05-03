import type { FixLoopResult } from "../types.js";

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function scoreConfidence(loopResult: FixLoopResult): number {
  const totalFixes = loopResult.appliedFixes.length + loopResult.failedFixes.length;
  const applyRate = totalFixes === 0 ? 0 : loopResult.appliedFixes.length / totalFixes;

  const severityPenalty = loopResult.smellReport.severity === "CRITICAL"
    ? 0.3
    : loopResult.smellReport.severity === "HIGH"
      ? 0.2
      : loopResult.smellReport.severity === "MEDIUM"
        ? 0.1
        : 0;

  const verificationBoost = loopResult.finalVerification.passed ? 0.25 : -0.25;
  const iterationPenalty = Math.max(0, loopResult.iterations - 1) * 0.05;
  const base = 0.5 + applyRate * 0.4 + verificationBoost - severityPenalty - iterationPenalty;

  return clamp(Number(base.toFixed(4)));
}
