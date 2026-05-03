import type { CodeFixerInput, NormalizedFixerInput } from "../types.js";
import { normalizeCodebase } from "../utils/code.util.js";
import { CodeFixerError } from "../utils/error.util.js";

const DEFAULT_OPTIONS = Object.freeze({
  maxIterations: 3,
  runTests: true,
  runLint: true,
  runTypecheck: true,
  runtime: "node",
});

export function validateAndNormalizeInput(input: CodeFixerInput): NormalizedFixerInput {
  if (!input || typeof input !== "object") {
    throw new CodeFixerError("ERR_INVALID_INPUT", "Input must be an object.");
  }

  const codebase = normalizeCodebase(input.codebase);
  if (Object.keys(codebase).length === 0) {
    throw new CodeFixerError("ERR_EMPTY_CODEBASE", "Codebase must include at least one file.");
  }

  const provided = input.options ?? {};
  const maxIterations = provided.maxIterations ?? DEFAULT_OPTIONS.maxIterations;
  if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
    throw new CodeFixerError("ERR_INVALID_MAX_ITERATIONS", "options.maxIterations must be a positive integer.");
  }

  return Object.freeze({
    codebase,
    options: Object.freeze({
      maxIterations,
      runTests: provided.runTests ?? DEFAULT_OPTIONS.runTests,
      runLint: provided.runLint ?? DEFAULT_OPTIONS.runLint,
      runTypecheck: provided.runTypecheck ?? DEFAULT_OPTIONS.runTypecheck,
      runtime: provided.runtime ?? DEFAULT_OPTIONS.runtime,
    }),
  });
}
