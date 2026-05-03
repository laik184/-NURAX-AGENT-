import type { FeedbackLoopInput, FeedbackLoopOutput, ImprovementPlan, LearningInsight } from './types.ts';
import {
  createInitialState,
  withAttempt,
  withStatus,
  isExhausted,
  getScoreTrend,
} from './state.ts';
import { evaluateOutput } from './agents/output-evaluator.agent.ts';
import { generateFeedback } from './agents/feedback-generator.agent.ts';
import { planImprovement } from './agents/improvement-planner.agent.ts';
import { decideRetry } from './agents/retry-decision.agent.ts';
import { extractLearning } from './agents/learning-extractor.agent.ts';
import { computeConfidence } from './agents/confidence-scorer.agent.ts';
import { deepFreeze } from './utils/deep-freeze.util.ts';

export function runFeedbackLoop(input: FeedbackLoopInput): FeedbackLoopOutput {
  const logs: string[] = [];
  const allImprovements: ImprovementPlan[] = [];

  let state = createInitialState(input.maxAttempts);

  logs.push(`[feedback-loop] START requestId=${input.requestId} maxAttempts=${input.maxAttempts}`);

  // Step 1 — Evaluate output
  const evaluation = evaluateOutput(input.executionResult);
  logs.push(
    `[output-evaluator] score=${evaluation.score.toFixed(2)} issues=${evaluation.issues.length} passed=${evaluation.passed}`,
  );

  // Update state with this attempt
  state = withAttempt(state, evaluation);

  // Step 2 — Generate feedback
  const feedback = generateFeedback(evaluation);
  logs.push(`[feedback-generator] feedbacks=${feedback.length} topPriority=${feedback[0]?.priority ?? 0}`);

  // Step 3 — Plan improvement
  const plan = planImprovement(feedback, evaluation, state.attempts);
  allImprovements.push(plan);
  logs.push(`[improvement-planner] strategy=${plan.strategy} target=${plan.targetModule} steps=${plan.steps.length}`);

  // Step 4 — Decide retry
  const retry = decideRetry(evaluation, state);
  logs.push(
    `[retry-decision] shouldRetry=${retry.shouldRetry} strategy=${retry.strategy} reason="${retry.reason}"`,
  );

  // Guard: if max attempts hit, mark failed
  if (isExhausted(state) && !evaluation.passed) {
    state = withStatus(state, 'FAILED');
    logs.push(`[feedback-loop] EXHAUSTED after ${state.attempts} attempt(s)`);
  } else if (evaluation.passed) {
    state = withStatus(state, 'SUCCESS');
    logs.push(`[feedback-loop] PASSED on attempt ${state.attempts}`);
  } else {
    state = withStatus(state, 'RUNNING');
  }

  // Step 5 — Extract learning from full history
  const allHistory = [...input.history, evaluation];
  const insights: LearningInsight[] = extractLearning(allHistory);
  logs.push(`[learning-extractor] insights=${insights.length} trend=${getScoreTrend(state)}`);

  // Step 6 — Compute final confidence
  const confidence = computeConfidence(allHistory, retry, insights, input.maxAttempts);
  logs.push(
    `[confidence-scorer] score=${confidence.score.toFixed(4)} grade=${confidence.grade}`,
  );

  logs.push(
    `[feedback-loop] COMPLETE status=${state.status} score=${confidence.score.toFixed(4)} attempts=${state.attempts}`,
  );

  return deepFreeze<FeedbackLoopOutput>({
    success: state.status === 'SUCCESS',
    score: confidence.score,
    attempts: state.attempts,
    improvements: allImprovements,
    insights,
    logs,
    ...(state.status === 'FAILED'
      ? { error: `Loop failed after ${state.attempts} attempt(s). Last score: ${evaluation.score.toFixed(2)}` }
      : {}),
  });
}
