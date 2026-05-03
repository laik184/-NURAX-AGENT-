import type { FixerInput, FixerOutput } from "./types.js";
import { getState, resetState, transitionState } from "./state.js";
import { detectErrors } from "./agents/error-detector.agent.js";
import { analyzeRootCause } from "./agents/root-cause-analyzer.agent.js";
import { selectFixStrategy } from "./agents/fix-strategy.agent.js";
import { generatePatch } from "./agents/patch-generator.agent.js";
import { applyFixPatches } from "./agents/fix-applier.agent.js";
import { validateFix } from "./agents/validation.agent.js";
import { rollbackFix } from "./agents/fallback.agent.js";
import { appendLog } from "./utils/logger.util.js";

export async function fixError(input: FixerInput): Promise<FixerOutput> {
  resetState();
  let logs: readonly string[] = Object.freeze([]);

  transitionState({ status: "ANALYZING" });
  logs = appendLog(logs, "detect", "Detecting error reports.");
  const detectedErrors = detectErrors(input.errorText);

  const errorId = detectedErrors[0]?.id ?? `error-${Date.now()}`;
  transitionState({ errorId, detectedErrors });

  logs = appendLog(logs, "analyze", "Analyzing root cause.");
  const rootCause = analyzeRootCause(detectedErrors);
  transitionState({ rootCause: rootCause.summary, logs });

  logs = appendLog(logs, "strategy", "Selecting fix strategy.");
  const strategy = selectFixStrategy(detectedErrors, rootCause);

  transitionState({ status: "FIXING" });
  logs = appendLog(logs, "patch", "Generating patch candidates.");
  const patches = await generatePatch(strategy, rootCause, detectedErrors, input.projectRoot);
  transitionState({ patches, logs });

  logs = appendLog(logs, "apply", "Applying patch set.");
  const applied = await applyFixPatches(input.projectRoot, patches);

  if (!applied.applied) {
    transitionState({ status: "FAILED", fixApplied: false, errors: Object.freeze([applied.error ?? "Failed to apply patches."]) });
    const output = Object.freeze({
      success: false,
      fixed: false,
      patches,
      logs: Object.freeze([...logs, ...applied.logs]),
      error: applied.error ?? "Patch application failed.",
    });

    return output;
  }

  logs = appendLog(logs, "validate", "Running post-fix validation.");
  const validation = await validateFix(input.projectRoot, input.validationCommand ?? "npm test");

  if (!validation.ok) {
    logs = appendLog(logs, "fallback", "Validation failed, rolling back patches.");
    const rolledBack = await rollbackFix(input.projectRoot, applied.rollbackSnapshot, validation.output);

    transitionState({
      status: "FAILED",
      fixApplied: false,
      logs: Object.freeze([...logs, ...validation.logs, ...rolledBack.logs]),
      errors: Object.freeze([validation.output]),
    });

    const output = Object.freeze({
      success: false,
      fixed: false,
      patches,
      logs: Object.freeze([...logs, ...validation.logs, ...rolledBack.logs]),
      error: `Validation failed: ${validation.output}`,
    });

    return output;
  }

  transitionState({
    status: "SUCCESS",
    fixApplied: true,
    logs: Object.freeze([...logs, ...validation.logs]),
  });

  const output = Object.freeze({
    success: true,
    fixed: true,
    patches,
    logs: Object.freeze([...logs, ...validation.logs]),
  });

  return output;
}

export function analyzeError(errorText: string): Readonly<ReturnType<typeof analyzeRootCause>> {
  const detectedErrors = detectErrors(errorText);
  return analyzeRootCause(detectedErrors);
}

export async function applyPatch(input: Pick<FixerInput, "projectRoot"> & { readonly patches: FixerOutput["patches"] }): Promise<FixerOutput> {
  const logs = appendLog(Object.freeze([]), "apply", "Applying externally provided patches.");
  const result = await applyFixPatches(input.projectRoot, input.patches);

  const output = Object.freeze({
    success: result.applied,
    fixed: result.applied,
    patches: input.patches,
    logs: Object.freeze([...logs, ...result.logs]),
    error: result.error,
  });

  return output;
}

export function getErrorFixerState() {
  return getState();
}
