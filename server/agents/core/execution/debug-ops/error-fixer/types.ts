export type ErrorKind =
  | "BUILD"
  | "RUNTIME"
  | "MODULE_NOT_FOUND"
  | "SYNTAX"
  | "TYPE"
  | "UNKNOWN";

export interface ErrorReport {
  readonly id: string;
  readonly kind: ErrorKind;
  readonly message: string;
  readonly filePath?: string;
  readonly line?: number;
  readonly column?: number;
  readonly stack: readonly string[];
  readonly raw: string;
}

export interface RootCause {
  readonly summary: string;
  readonly probableFile?: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

export type FixAction =
  | "ADD_IMPORT"
  | "REPLACE_IDENTIFIER"
  | "CREATE_FILE"
  | "UPDATE_FILE"
  | "NOOP";

export interface FixStrategy {
  readonly action: FixAction;
  readonly reason: string;
  readonly targetFile?: string;
  readonly confidence: number;
}

export interface Patch {
  readonly id: string;
  readonly filePath: string;
  readonly before: string;
  readonly after: string;
  readonly diff: string;
}

export interface FixResult {
  readonly applied: boolean;
  readonly patches: readonly Patch[];
  readonly rollbackSnapshot: readonly Patch[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly command: string;
  readonly output: string;
  readonly logs: readonly string[];
}

export interface FixerInput {
  readonly errorText: string;
  readonly projectRoot: string;
  readonly validationCommand?: string;
  readonly allowTests?: boolean;
}

export interface FixerOutput {
  readonly success: boolean;
  readonly fixed: boolean;
  readonly patches: readonly Patch[];
  readonly logs: readonly string[];
  readonly error?: string;
}
