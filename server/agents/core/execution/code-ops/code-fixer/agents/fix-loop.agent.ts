import type { CodeFixerDependencies, FileTree, FixLoopIteration, FixLoopResult, NormalizedFixerInput } from "../types.js";
import { createFixPlans } from "./fix-planner.agent.js";
import { validateFixPlans } from "../validators/fix-plan.validator.js";
import { applyPlans } from "./patch-applier.agent.js";
import { verifyCodebase } from "./verification.agent.js";
import { decideRetry } from "./retry-policy.agent.js";
import { CodeFixerError } from "../utils/error.util.js";
import { toSourceFiles } from "../utils/code.util.js";

export function runFixLoop(input: NormalizedFixerInput, dependencies: CodeFixerDependencies): FixLoopResult {
  let codebase: FileTree = input.codebase;
  const appliedFixes = [];
  const failedFixes = [];
  const history: FixLoopIteration[] = [];

  let finalVerification = verifyCodebase(codebase, input.options, dependencies.testRunner);
  let latestReport;

  for (let iteration = 1; iteration <= input.options.maxIterations; iteration += 1) {
    const detection = dependencies.smellDetector.detect({ sourceFiles: toSourceFiles(codebase), now: 0 });
    if (!detection.ok || !detection.data) {
      throw new CodeFixerError("ERR_DETECTION_FAILED", detection.error ?? "Code smell detection failed.");
    }

    latestReport = detection.data;
    const plans = createFixPlans(
      latestReport.smells,
      dependencies.strategyAgent,
      input.options.runtime,
      iteration,
      input.options.maxIterations,
    );

    validateFixPlans(plans);

    const patching = applyPlans(codebase, plans, dependencies.patchEngine, iteration);
    codebase = patching.updatedCodebase;
    appliedFixes.push(...patching.appliedFixes);
    failedFixes.push(...patching.failedFixes);

    finalVerification = verifyCodebase(codebase, input.options, dependencies.testRunner);

    const loopState: FixLoopIteration = Object.freeze({
      iteration,
      smells: latestReport.smells,
      plans,
      applied: patching.appliedFixes,
      failed: patching.failedFixes,
      verification: finalVerification,
    });
    history.push(loopState);

    const retry = decideRetry(iteration, input.options.maxIterations, finalVerification.passed, plans.length);
    if (!retry.shouldRetry) {
      return Object.freeze({
        finalCodebase: codebase,
        iterations: iteration,
        appliedFixes: Object.freeze([...appliedFixes]),
        failedFixes: Object.freeze([...failedFixes]),
        finalVerification,
        smellReport: latestReport,
        history: Object.freeze(history),
      });
    }
  }

  if (!latestReport) {
    throw new CodeFixerError("ERR_LOOP_ABORTED", "Fix loop aborted before smell report creation.");
  }

  return Object.freeze({
    finalCodebase: codebase,
    iterations: input.options.maxIterations,
    appliedFixes: Object.freeze([...appliedFixes]),
    failedFixes: Object.freeze([...failedFixes]),
    finalVerification,
    smellReport: latestReport,
    history: Object.freeze(history),
  });
}
