export type GenerationStatus = "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";

export interface CodeRequest {
  readonly requestId: string;
  readonly intent: string;
  readonly frameworkHint?: "Express" | "React" | "Node";
  readonly constraints?: readonly string[];
}

export interface CodeFile {
  readonly path: string;
  readonly content: string;
}

export interface CodeMap {
  readonly files: readonly CodeFile[];
}

export interface GenerationResult {
  readonly success: boolean;
  readonly files: readonly CodeFile[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface PlannedStructure {
  readonly files: readonly string[];
  readonly rationale: readonly string[];
}

export interface TemplateSelection {
  readonly templateName: string;
  readonly conventions: readonly string[];
}
