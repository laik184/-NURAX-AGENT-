import type { ExperimentInput, ExperimentOutput } from "./types";
import { planExperiment } from "./agents/experiment-planner.agent";
import { generateVariants } from "./agents/variant-generator.agent";
import { executeVariants } from "./agents/execution-controller.agent";
import { collectResults } from "./agents/result-collector.agent";
import { compareResults } from "./agents/comparator.agent";
import { selectWinner } from "./agents/winner-selector.agent";
import { scoreConfidence } from "./agents/confidence-scorer.agent";
import { recordExperimentResult } from "./state";

function validateInput(input: ExperimentInput): string | null {
  if (!input || typeof input !== "object") return "input must be an object";
  if (!input.goal || typeof input.goal !== "string" || !input.goal.trim()) return "goal is required and cannot be empty";
  if (typeof input.context !== "string") return "context must be a string";
  return null;
}

export function runExperiment(input: ExperimentInput): ExperimentOutput {
  const allLogs: string[] = [];

  function fail(message: string): ExperimentOutput {
    allLogs.push(`[experimentation] FATAL: ${message}`);
    return { success: false, logs: allLogs, error: message };
  }

  try {
    const validationError = validateInput(input);
    if (validationError) return fail(validationError);

    allLogs.push(`[experimentation] starting — goal="${input.goal.slice(0, 60)}${input.goal.length > 60 ? "..." : ""}"`);

    // STEP 1: Plan the experiment
    const planOut = planExperiment(input);
    allLogs.push(...planOut.logs);
    if (!planOut.success || !planOut.plan) return fail(planOut.error ?? "experiment planning failed");
    const plan = planOut.plan;

    // STEP 2: Generate variants
    const variantOut = generateVariants(plan);
    allLogs.push(...variantOut.logs);
    if (!variantOut.success || !variantOut.variants) return fail(variantOut.error ?? "variant generation failed");
    const variants = variantOut.variants;

    // STEP 3: Execute variants (simulated parallel model)
    const execOut = executeVariants(variants);
    allLogs.push(...execOut.logs);
    if (!execOut.success || !execOut.rawResults) return fail(execOut.error ?? "execution failed");
    const rawResults = execOut.rawResults;

    // STEP 4: Collect and structure results
    const collectOut = collectResults(rawResults, variants);
    allLogs.push(...collectOut.logs);
    if (!collectOut.success || !collectOut.results) return fail(collectOut.error ?? "result collection failed");
    const results = collectOut.results;

    // STEP 5: Compare across metrics
    const compareOut = compareResults(results);
    allLogs.push(...compareOut.logs);
    if (!compareOut.success || !compareOut.comparisons) return fail(compareOut.error ?? "comparison failed");
    const comparisons = compareOut.comparisons;

    // STEP 6: Select winner
    const winnerOut = selectWinner(comparisons, variants);
    allLogs.push(...winnerOut.logs);
    if (!winnerOut.success || !winnerOut.winner) return fail(winnerOut.error ?? "winner selection failed");
    const winnerResult = winnerOut.winner;

    // STEP 7: Score confidence
    const confOut = scoreConfidence(comparisons, results);
    allLogs.push(...confOut.logs);
    if (!confOut.success || confOut.confidence === undefined) return fail(confOut.error ?? "confidence scoring failed");
    const confidence = confOut.confidence;

    // Persist to state
    recordExperimentResult(plan.goal, winnerResult.variant, confidence, results);

    allLogs.push(
      `[experimentation] complete — winner="${winnerResult.variant.name}" confidence=${confidence} variants=${variants.length}`
    );

    return {
      success: true,
      logs: allLogs,
      data: {
        winner: winnerResult.variant,
        confidence,
        results,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
