import { detectConflicts } from "./agents/conflict.detector.agent.js";
import { selectTruth } from "./agents/truth.selector.agent.js";
import { validateOutputs } from "./agents/validation.engine.agent.js";
import {
  createEmptyState,
  toOutput,
  withConflicts,
  withFinalTruth,
  withValidationResults,
} from "./state.js";
import type { ConsistencyInput, ConsistencyOutput } from "./types.js";

export function runConsistencyEngine(input: ConsistencyInput): ConsistencyOutput {
  let state = createEmptyState();

  const conflictResult = detectConflicts(input);
  state = withConflicts(state, conflictResult.conflicts);

  const validationResults = validateOutputs(input);
  state = withValidationResults(state, validationResults);

  const finalTruth = selectTruth(input, state.conflicts, state.validationResults);
  state = withFinalTruth(state, finalTruth);

  return toOutput(state);
}
