import { applyPatch } from "../patch-engine/index.js";

import type { CodeFixerDependencies, CodeFixerInput, FixResult, SmellReport, SourceFile, FixStrategy } from "./types.js";
import { validateAndNormalizeInput } from "./validators/input.validator.js";
import { runFixLoop } from "./agents/fix-loop.agent.js";
import { generateDiffs } from "./agents/diff-generator.agent.js";
import { scoreConfidence } from "./agents/confidence-scorer.agent.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";
import { startTimer } from "./utils/timer.util.js";

function noopSmellDetector(input: { readonly sourceFiles: readonly SourceFile[] }): {
  readonly ok: boolean;
  readonly data?: SmellReport;
  readonly error?: string;
} {
  return {
    ok: true,
    data: {
      sourceFiles: input.sourceFiles,
      smells: [],
      totalSmells: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      generatedAt: Date.now(),
    },
  };
}

function noopStrategyAgent(
  _sessionId: string,
  error: { readonly message: string },
  _context: { readonly runtime: string; readonly retryCount: number; readonly maxRetries: number },
): { readonly ok: boolean; readonly data?: FixStrategy; readonly error?: string } {
  return {
    ok: true,
    data: { action: "NO_ACTION", reason: `No strategy agent injected for: ${error.message}`, confidence: 0 },
  };
}

export function buildDefaultDependencies(): CodeFixerDependencies {
  return Object.freeze({
    smellDetector: { detect: noopSmellDetector },
    strategyAgent: { analyze: noopStrategyAgent },
    patchEngine: { applyPatch },
  });
}

export function runCodeFixer(
  input: CodeFixerInput,
  dependencies: CodeFixerDependencies = buildDefaultDependencies(),
): Readonly<FixResult> {
  const timer = startTimer();
  const normalized = validateAndNormalizeInput(input);
  const loopResult = runFixLoop(normalized, dependencies);
  const diffs = generateDiffs(normalized.codebase, loopResult.finalCodebase);
  const confidence = scoreConfidence(loopResult);

  const output: FixResult = {
    fixedCode: typeof input.codebase === "string"
      ? loopResult.finalCodebase["inline.ts"] ?? ""
      : loopResult.finalCodebase,
    diffs,
    appliedFixes: loopResult.appliedFixes,
    failedFixes: loopResult.failedFixes,
    iterations: loopResult.iterations,
    confidence,
    success: loopResult.finalVerification.passed,
  };

  // deterministic, side-effect free read for observability hooks
  void timer.elapsedMs();

  return deepFreeze(output);
}
