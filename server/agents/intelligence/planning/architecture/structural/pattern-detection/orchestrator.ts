import type { ArchitecturePatternReport, PatternAnalysisInput, PatternAnalysisState } from "./types.js";
import { buildImportGraph } from "./utils/import-graph.util.js";
import { extractModules } from "./utils/folder-structure.util.js";
import { setPatternState, getPatternState, resetPatternState } from "./state.js";

import { classifyArchitecturePattern } from "./agents/pattern-classifier.agent.js";
import { detectLayering } from "./agents/layering.detector.agent.js";
import { analyzeModularity } from "./agents/modularity.analyzer.agent.js";
import { detectMicroserviceBoundaries } from "./agents/microservice.detector.agent.js";
import { detectAntiPatterns } from "./agents/anti-pattern.detector.agent.js";
import { analyzeCouplingPatterns } from "./agents/coupling-pattern.analyzer.agent.js";
import { calculatePatternScore } from "./agents/pattern-score.calculator.agent.js";

function validateInput(input: PatternAnalysisInput): void {
  if (!input || !Array.isArray(input.files)) {
    throw new Error("Invalid input: files must be an array of file paths.");
  }
  for (const file of input.files) {
    if (typeof file !== "string" || file.trim() === "") {
      throw new Error("Invalid input: each file path must be a non-empty string.");
    }
  }
}

export function detectArchitecturePatterns(input: PatternAnalysisInput): ArchitecturePatternReport {
  validateInput(input);

  const files = Object.freeze([...input.files].sort((a, b) => a.localeCompare(b)));
  const importGraph = buildImportGraph({ files, fileContents: input.fileContents });
  const modules = extractModules(files);

  const initialState: PatternAnalysisState = {
    files,
    importGraph,
    modules,
    detectedPatterns: Object.freeze([]),
    antiPatterns: Object.freeze([]),
  };
  setPatternState(initialState);

  const classification = classifyArchitecturePattern({ files, importGraph, modules });
  const layering = detectLayering({ files, importGraph });
  const modularity = analyzeModularity({ files, importGraph });
  const microservices = detectMicroserviceBoundaries({ files, importGraph });
  const antiPatterns = detectAntiPatterns({ files, importGraph, layerViolations: layering.violations });
  const coupling = analyzeCouplingPatterns({ importGraph });
  const score = calculatePatternScore({
    modularityScore: modularity.modularityScore,
    couplingScore: coupling.couplingScore,
    layeringScore: layering.score,
    antiPatternCount: antiPatterns.length,
  });

  setPatternState({
    files,
    importGraph,
    modules,
    detectedPatterns: Object.freeze([
      classification.type,
      `layering:${layering.score}`,
      `microservice-confidence:${Math.round(microservices.confidence * 100)}`,
    ]),
    antiPatterns,
  });

  return Object.freeze({
    architectureType: classification.type,
    confidence: classification.confidence,
    antiPatterns,
    couplingScore: coupling.couplingScore,
    modularityScore: modularity.modularityScore,
    finalScore: score.score,
  });
}

export function getAnalysisState(): Readonly<PatternAnalysisState> {
  return getPatternState();
}

export function resetPatternDetection(): void {
  resetPatternState();
}
