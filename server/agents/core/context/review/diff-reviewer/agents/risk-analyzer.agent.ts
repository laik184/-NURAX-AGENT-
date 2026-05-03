import type { ClassifiedChange, RiskFinding } from "../types.js";
import { matchRiskPatterns } from "../utils/pattern-matcher.util.js";

export function analyzeRisks(changes: readonly ClassifiedChange[]): readonly RiskFinding[] {
  const findings: RiskFinding[] = [];

  for (const change of changes) {
    for (const line of change.addedLines) {
      const matches = matchRiskPatterns(line);
      for (const match of matches) {
        findings.push(Object.freeze({
          filePath: change.filePath,
          level: match.level,
          category: match.category,
          message: match.message,
        }));
      }
    }
  }

  return Object.freeze(findings);
}
