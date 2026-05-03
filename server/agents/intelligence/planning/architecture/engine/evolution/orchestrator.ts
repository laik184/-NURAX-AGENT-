import type { ArchitectureAnalysisReport, ArchitectureEvolutionPlan, EvolutionState } from "./types.js";
import { setEvolutionState, setLastPlan, getEvolutionState, getLastPlan, clearEvolutionState } from "./state.js";
import { detectArchitecturePattern } from "./agents/pattern-detector.agent.js";
import { buildEvolutionStrategy } from "./agents/evolution-strategy.agent.js";
import { generateMigrationPlan } from "./agents/migration-planner.agent.js";
import { analyzeEvolutionRisks } from "./agents/risk-analyzer.agent.js";
import { evaluateTradeoffs } from "./agents/tradeoff-evaluator.agent.js";
import { scoreEvolutionPlan } from "./utils/scoring.util.js";

function assertReport(report: Readonly<ArchitectureAnalysisReport>): void {
  if (!report || typeof report !== "object") {
    throw new Error("ArchitectureAnalysisReport is required.");
  }

  if (!Array.isArray(report.violations)) {
    throw new Error("ArchitectureAnalysisReport.violations must be an array.");
  }
}

export function runArchitectureEvolution(
  report: Readonly<ArchitectureAnalysisReport>,
): ArchitectureEvolutionPlan {
  assertReport(report);

  const detected = detectArchitecturePattern(report);
  const strategy = buildEvolutionStrategy(report, detected);
  const migration = generateMigrationPlan(detected, strategy);
  const risk = analyzeEvolutionRisks(detected, migration);
  const tradeoff = evaluateTradeoffs(strategy.targetPattern);

  const score = scoreEvolutionPlan(risk.riskLevel, migration.migrationSteps, detected.antiPatterns);

  const evolutionPlan: ArchitectureEvolutionPlan = Object.freeze({
    currentArchitecture: detected.currentPattern,
    targetArchitecture: strategy.targetPattern,
    strategy: strategy.strategy,
    migrationSteps: migration.migrationSteps,
    risks: risk.risks,
    tradeoffs: tradeoff.tradeoffs,
    score,
  });

  const state: EvolutionState = Object.freeze({
    currentPattern: detected.currentPattern,
    targetPattern: strategy.targetPattern,
    riskLevel: risk.riskLevel,
    stepsGenerated: migration.migrationSteps.length,
  });

  setEvolutionState(state);
  setLastPlan(evolutionPlan);

  return evolutionPlan;
}

export {
  getEvolutionState,
  getLastPlan,
  clearEvolutionState,
};
