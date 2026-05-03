import { runAntiPatternDetectorAgent } from "./agents/anti-pattern-detector.agent.js";
import {
  runArchitectureClassifierAgent,
  type ArchitectureClassification,
} from "./agents/architecture-classifier.agent.js";
import {
  runCouplingAnalyzerAgent,
  type CouplingAnalysis,
} from "./agents/coupling-analyzer.agent.js";
import { runLayeringEnforcerAgent } from "./agents/layering-enforcer.agent.js";
import { runModularityAnalyzerAgent } from "./agents/modularity-analyzer.agent.js";
import { runPatternDetectorAgent } from "./agents/pattern-detector.agent.js";
import { runRefactorSuggesterAgent } from "./agents/refactor-suggester.agent.js";
import {
  runScalabilityEvaluatorAgent,
  type ScalabilityEvaluation,
} from "./agents/scalability-evaluator.agent.js";
import type {
  FrameworkPatternEngineInput,
  FrameworkPatternEngineOutput,
  Violation,
} from "./types.js";

export function runFrameworkPatternEngine(
  input: FrameworkPatternEngineInput,
): FrameworkPatternEngineOutput {
  const patterns = runPatternDetectorAgent(input);
  const antiPatterns = runAntiPatternDetectorAgent(input);
  const architecture: ArchitectureClassification = runArchitectureClassifierAgent(patterns, antiPatterns);
  const layeringViolations = runLayeringEnforcerAgent(input);
  const modularityViolations = runModularityAnalyzerAgent(input);
  const coupling: CouplingAnalysis = runCouplingAnalyzerAgent(input);
  const scalability: ScalabilityEvaluation = runScalabilityEvaluatorAgent(input);

  const violations: readonly Violation[] = Object.freeze([
    ...layeringViolations,
    ...modularityViolations,
    ...coupling.violations,
  ]);

  const suggestions = runRefactorSuggesterAgent(antiPatterns, violations);
  const score = Math.round(
    (architecture.maintainabilityScore + coupling.couplingScore + scalability.score) / 3,
  );

  return Object.freeze({
    success: true,
    logs: Object.freeze([
      "Framework pattern engine execution completed.",
      ...scalability.logs,
      `Detected patterns: ${patterns.map((pattern) => pattern.name).join(", ") || "none"}`,
      `Violations: ${violations.length}`,
      `Final score: ${score}`,
    ]),
    result: Object.freeze({
      architectureType: architecture.architectureType,
      patterns: Object.freeze([...patterns]),
      antiPatterns: Object.freeze([...antiPatterns]),
      violations: Object.freeze([...violations]),
      suggestions: Object.freeze([...suggestions]),
      score,
    }),
  });
}
