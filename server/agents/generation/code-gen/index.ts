import { CodeGenOrchestrator } from "./orchestrator.js";
import type { CodeRequest, GenerationResult, ValidationResult } from "./types.js";

const orchestrator = new CodeGenOrchestrator();

export async function generateCode(request: CodeRequest): Promise<GenerationResult> {
  return orchestrator.generate(request);
}

export function validateCode(result: GenerationResult): ValidationResult {
  return orchestrator.validateOutput(result);
}

export function buildStructure(request: CodeRequest): readonly string[] {
  return orchestrator.buildStructure(request);
}

export type {
  CodeFile,
  CodeMap,
  CodeRequest,
  GenerationResult,
  GenerationStatus,
  PlannedStructure,
  TemplateSelection,
  ValidationResult,
} from "./types.js";
