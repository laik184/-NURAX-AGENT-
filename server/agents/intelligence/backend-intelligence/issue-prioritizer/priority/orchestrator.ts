import { analyzeImpact } from "./agents/impact.analyzer.agent.js";
import { orderIssues } from "./agents/ordering.engine.agent.js";
import { scoreSeverity } from "./agents/severity.scorer.agent.js";
import { detectUrgency } from "./agents/urgency.detector.agent.js";
import { createPriorityState, toPriorityResult, withScored, withSorted } from "./state.js";
import type { AnalysisOutput, PriorityResult } from "./types.js";

export function runPriorityEngine(analysis: AnalysisOutput): PriorityResult {
  const { issues } = analysis;

  const severityScored = scoreSeverity(issues);
  const impactScored   = analyzeImpact(issues, severityScored);
  const urgencyScored  = detectUrgency(issues, impactScored);
  const sorted         = orderIssues(urgencyScored);

  let state = createPriorityState(issues);
  state     = withScored(state, urgencyScored);
  state     = withSorted(state, sorted);

  return toPriorityResult(state);
}
