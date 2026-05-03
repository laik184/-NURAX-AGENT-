import type { MetaReasoningInput, MetaReasoningOutput, AnalysisResult } from "./types";
import { analyzeDecision } from "./agents/decision-analyzer.agent";
import { detectFlaws } from "./agents/flaw-detector.agent";
import { generateAlternatives } from "./agents/alternative-generator.agent";
import { compareStrategies } from "./agents/strategy-comparator.agent";
import { suggestImprovement } from "./agents/improvement-suggester.agent";
import { evaluateConfidence } from "./agents/confidence-evaluator.agent";
import { recordAnalysis } from "./state";
import { normalizeInput, normalizeFlawList, normalizeAlternativeList } from "./utils/normalize.util";

const EMPTY_ANALYSIS: AnalysisResult = Object.freeze({
  flaws: [],
  alternatives: [],
  bestStrategy: "No strategy available",
  improvement: "No improvement identified",
  confidence: 0,
});

export function runMetaReasoning(input: MetaReasoningInput): MetaReasoningOutput {
  const allLogs: string[] = [];

  function fail(message: string): MetaReasoningOutput {
    allLogs.push(`[meta-reasoning] FATAL: ${message}`);
    return { success: false, logs: allLogs, analysis: EMPTY_ANALYSIS, error: message };
  }

  try {
    const normalized = normalizeInput(input);

    if (!normalized.decision.trim()) return fail("decision field is required and cannot be empty");
    if (!normalized.outcome.trim()) return fail("outcome field is required and cannot be empty");

    allLogs.push(`[meta-reasoning] starting — decision="${normalized.decision.slice(0, 60)}${normalized.decision.length > 60 ? "..." : ""}"`);

    // STEP 1: Analyze the decision
    const analyzerOut = analyzeDecision(normalized);
    allLogs.push(...analyzerOut.logs);
    if (!analyzerOut.success || !analyzerOut.analysis) return fail(analyzerOut.error ?? "decision analysis failed");
    const analysis = analyzerOut.analysis;

    // STEP 2: Detect flaws
    const flawOut = detectFlaws(normalized, analysis);
    allLogs.push(...flawOut.logs);
    if (!flawOut.success || !flawOut.flaws) return fail(flawOut.error ?? "flaw detection failed");
    const flaws = flawOut.flaws;

    // STEP 3: Generate alternatives
    const altOut = generateAlternatives(normalized, flaws);
    allLogs.push(...altOut.logs);
    if (!altOut.success || !altOut.alternatives) return fail(altOut.error ?? "alternative generation failed");
    const alternatives = altOut.alternatives;

    // STEP 4: Compare strategies
    const compareOut = compareStrategies(alternatives);
    allLogs.push(...compareOut.logs);
    if (!compareOut.success || !compareOut.comparison) return fail(compareOut.error ?? "strategy comparison failed");
    const comparison = compareOut.comparison;

    // STEP 5: Suggest improvement
    const improveOut = suggestImprovement(flaws, comparison, alternatives);
    allLogs.push(...improveOut.logs);
    if (!improveOut.success || improveOut.improvement === undefined) return fail(improveOut.error ?? "improvement suggestion failed");
    const improvement = improveOut.improvement;

    // STEP 6: Evaluate confidence
    const confOut = evaluateConfidence(analysis, flaws, comparison, normalized.outcome);
    allLogs.push(...confOut.logs);
    if (!confOut.success || confOut.confidence === undefined) return fail(confOut.error ?? "confidence evaluation failed");
    const confidence = confOut.confidence;

    const result: AnalysisResult = {
      flaws: normalizeFlawList(flaws.map((f) => f.description)),
      alternatives: normalizeAlternativeList(alternatives.map((a) => `${a.title}: ${a.approach}`)),
      bestStrategy: `${comparison.winnerTitle} — ${comparison.rationale}`,
      improvement,
      confidence,
    };

    recordAnalysis(normalized.decision, normalized.outcome, result);

    allLogs.push(
      `[meta-reasoning] complete — flaws=${flaws.length} alternatives=${alternatives.length} bestStrategy="${comparison.winnerTitle}" confidence=${confidence}`
    );

    return { success: true, logs: allLogs, analysis: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
