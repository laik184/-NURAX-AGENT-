export type ValidationStatus = "IDLE" | "VALIDATING" | "PASSED" | "FAILED";

export type EnvValueType = "string" | "number" | "boolean" | "url" | "email" | "port" | "token" | "json";

export type PolicySeverity = "info" | "warning" | "error" | "critical";

export type SecretRisk = "low" | "medium" | "high" | "critical";

export interface EnvSchema {
  readonly key: string;
  readonly type: EnvValueType;
  readonly required: boolean;
  readonly secret?: boolean;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly allowedValues?: readonly string[];
  readonly description?: string;
  readonly example?: string;
}

export interface ValidationError {
  readonly key: string;
  readonly message: string;
  readonly severity: PolicySeverity;
  readonly value?: string;
}

export interface PolicyRule {
  readonly id: string;
  readonly description: string;
  readonly severity: PolicySeverity;
  readonly check: (env: Readonly<Record<string, string>>, schema: readonly EnvSchema[]) => readonly string[];
}

export interface SecretFinding {
  readonly key: string;
  readonly risk: SecretRisk;
  readonly reason: string;
  readonly maskedValue: string;
}

export interface EnvValidationResult {
  readonly success: boolean;
  readonly missing: readonly string[];
  readonly invalid: readonly ValidationError[];
  readonly warnings: readonly string[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface EnvValidatorState {
  readonly env: Readonly<Record<string, string>>;
  readonly missing: readonly string[];
  readonly invalid: readonly ValidationError[];
  readonly warnings: readonly string[];
  readonly status: ValidationStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface StatePatch {
  readonly env?: Readonly<Record<string, string>>;
  readonly missing?: readonly string[];
  readonly invalid?: readonly ValidationError[];
  readonly warnings?: readonly string[];
  readonly status?: ValidationStatus;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface AgentResult {
  readonly nextState: Readonly<EnvValidatorState>;
  readonly output: Readonly<EnvValidationResult>;
}
