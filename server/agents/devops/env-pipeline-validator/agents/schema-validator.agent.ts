import { transitionState } from "../state.js";
import type { AgentResult, EnvSchema, EnvValidatorState, ValidationError } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { maskValue, isSensitiveKey } from "../utils/mask.util.js";

const SOURCE = "schema-validator";

export interface SchemaValidatorInput {
  readonly env: Readonly<Record<string, string>>;
  readonly schema: readonly EnvSchema[];
  readonly state: Readonly<EnvValidatorState>;
}

export interface SchemaValidatorOutput extends AgentResult {
  readonly schemaErrors: readonly ValidationError[];
  readonly warnings: readonly string[];
}

export function validateSchema(input: SchemaValidatorInput): Readonly<SchemaValidatorOutput> {
  const { env, schema, state } = input;
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  for (const entry of schema) {
    const value = env[entry.key];
    const sensitive = entry.secret || isSensitiveKey(entry.key);
    const displayValue = value !== undefined ? (sensitive ? maskValue(value) : value) : undefined;

    if (entry.required && (value === undefined || value.trim() === "")) {
      errors.push(
        Object.freeze({
          key: entry.key,
          message: `Required field "${entry.key}" is missing or empty`,
          severity: "error" as const,
        }),
      );
      continue;
    }

    if (value === undefined) continue;

    if (value.trim() === "" && !entry.required) {
      warnings.push(`${entry.key}: optional field is present but empty`);
    }

    if (entry.description && value === entry.example) {
      warnings.push(`${entry.key}: value matches the example value — likely not configured for this environment`);
    }

    if (entry.secret && !sensitive) {
      warnings.push(`${entry.key}: marked as secret in schema but key name does not follow secret naming conventions`);
    }
  }

  const undeclaredKeys = Object.keys(env).filter(
    (k) => !schema.some((s) => s.key === k),
  );

  if (undeclaredKeys.length > 0) {
    warnings.push(`${undeclaredKeys.length} env var(s) present but not declared in schema: ${undeclaredKeys.join(", ")}`);
  }

  const frozen = Object.freeze(errors);
  const frozenWarnings = Object.freeze(warnings);

  const existingInvalid = state.invalid;
  const existingWarnings = state.warnings;
  const mergedInvalid = Object.freeze([...existingInvalid, ...frozen]);
  const mergedWarnings = Object.freeze([...existingWarnings, ...frozenWarnings]);

  const log = buildLog(
    SOURCE,
    `Schema validation: ${schema.length} field(s) — ${frozen.length} error(s), ${frozenWarnings.length} warning(s), ${undeclaredKeys.length} undeclared var(s)`,
  );

  return {
    nextState: transitionState(state, {
      invalid: mergedInvalid,
      warnings: mergedWarnings,
      appendLog: log,
    }),
    output: Object.freeze({
      success: frozen.length === 0,
      missing: Object.freeze([]),
      invalid: frozen,
      warnings: frozenWarnings,
      logs: Object.freeze([log]),
      ...(frozen.length > 0 ? { error: "schema_validation_failed" } : {}),
    }),
    schemaErrors: frozen,
    warnings: frozenWarnings,
  };
}
