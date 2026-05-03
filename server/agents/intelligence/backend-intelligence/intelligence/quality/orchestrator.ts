import { scoreDimensions }        from "./agents/dimension.scorer.agent.js";
import { classifyQualityGrade }   from "./agents/grade.classifier.agent.js";
import { aggregateWeightedScore } from "./agents/score.aggregator.agent.js";
import { resolveQualityWeights }  from "./agents/weight.manager.agent.js";
import { createInitialQualityState, recordQualityScore } from "./state.js";
import type { QualityInput, QualityReport } from "./types.js";
import type { QualityState } from "./state.js";

export function runQualityEngine(
  input: QualityInput,
  state: QualityState = createInitialQualityState(),
): Readonly<{ report: QualityReport; state: QualityState }> {
  const breakdown  = scoreDimensions(input);
  const weights    = resolveQualityWeights();
  const score      = aggregateWeightedScore(breakdown, weights);
  const grade      = classifyQualityGrade(score);
  const nextState  = recordQualityScore(state, score);

  const report: QualityReport = Object.freeze({
    score,
    grade,
    breakdown: Object.freeze({ ...breakdown }),
  });

  return Object.freeze({ report, state: nextState });
}
