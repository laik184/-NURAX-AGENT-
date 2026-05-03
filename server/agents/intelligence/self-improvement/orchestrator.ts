import type { SelfImprovementInput, ModuleOutput, ImprovementPlan } from "./types";
import { analyzePerformance } from "./agents/performance-analyzer.agent";
import { detectBottlenecks } from "./agents/bottleneck-detector.agent";
import { planImprovements } from "./agents/improvement-planner.agent";
import { selectStrategy } from "./agents/strategy-selector.agent";
import { scoreOptimizations } from "./agents/optimization-scorer.agent";
import { prioritizeImprovements } from "./agents/improvement-prioritizer.agent";
import { recordAnalysis } from "./state";
import { estimatedGain } from "./utils/scoring.util";

export function runSelfImprovement(input: SelfImprovementInput): ModuleOutput {
  const logs: string[] = [];

  try {
    logs.push(`[self-improvement] session=${input.sessionId} starting pipeline`);

    const perfOut = analyzePerformance(input);
    logs.push(...perfOut.logs);
    if (!perfOut.success || !perfOut.analysis) {
      return { success: false, logs, error: perfOut.error ?? "performance-analyzer failed" };
    }

    const bnOut = detectBottlenecks(input, perfOut.analysis);
    logs.push(...bnOut.logs);
    if (!bnOut.success || !bnOut.bottlenecks) {
      return { success: false, logs, error: bnOut.error ?? "bottleneck-detector failed" };
    }

    const planOut = planImprovements(bnOut.bottlenecks);
    logs.push(...planOut.logs);
    if (!planOut.success || !planOut.actions) {
      return { success: false, logs, error: planOut.error ?? "improvement-planner failed" };
    }

    const stratOut = selectStrategy(planOut.actions);
    logs.push(...stratOut.logs);
    if (!stratOut.success || !stratOut.selectedStrategy) {
      return { success: false, logs, error: stratOut.error ?? "strategy-selector failed" };
    }

    const scoreOut = scoreOptimizations(planOut.actions, stratOut.selectedStrategy);
    logs.push(...scoreOut.logs);
    if (!scoreOut.success || !scoreOut.scoredActions) {
      return { success: false, logs, error: scoreOut.error ?? "optimization-scorer failed" };
    }

    const prioOut = prioritizeImprovements(scoreOut.scoredActions, bnOut.bottlenecks);
    logs.push(...prioOut.logs);
    if (!prioOut.success || !prioOut.prioritizedActions) {
      return { success: false, logs, error: prioOut.error ?? "improvement-prioritizer failed" };
    }

    const modulesOptScore = prioOut.prioritizedActions.length > 0
      ? Math.round(
          prioOut.prioritizedActions.reduce((s, a) => s + a.optimizationScore, 0) /
          prioOut.prioritizedActions.length
        )
      : 100;

    const gain = estimatedGain(prioOut.prioritizedActions);

    const plan: ImprovementPlan = Object.freeze({
      sessionId: input.sessionId,
      generatedAt: Date.now(),
      performanceAnalysis: perfOut.analysis,
      bottlenecks: bnOut.bottlenecks,
      actions: prioOut.prioritizedActions,
      selectedStrategy: stratOut.selectedStrategy,
      optimizationScore: modulesOptScore,
      estimatedGain: gain,
    });

    recordAnalysis(plan);

    logs.push(
      `[self-improvement] complete — bottlenecks=${bnOut.bottlenecks.length} actions=${plan.actions.length} strategy=${plan.selectedStrategy} optScore=${plan.optimizationScore} estimatedGain=${plan.estimatedGain}%`
    );

    return { success: true, logs, plan };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(`[self-improvement] FATAL: ${message}`);
    return { success: false, logs, error: message };
  }
}
