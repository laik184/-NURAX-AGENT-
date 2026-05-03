import { transitionState } from "../state.js";
import type { AgentResult, EnvSchema, EnvValidatorState, ValidationError } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { maskValue, isSensitiveKey } from "../utils/mask.util.js";
import { checkType, typeDescription } from "../utils/type-checker.util.js";
import { testPattern } from "../utils/regex.util.js";

const SOURCE = "format-validator";

export interface FormatValidatorInput {
  readonly env: Readonly<Record<string, string>>;
  readonly schema: readonly EnvSchema[];
  readonly state: Readonly<EnvValidatorState>;
}

export interface FormatValidatorOutput extends AgentResult {
  readonly formatErrors: readonly ValidationError[];
}

export function validateFormats(input: FormatValidatorInput): Readonly<FormatValidatorOutput> {
  const { env, schema, state } = input;
  const errors: ValidationError[] = [];

  for (const entry of schema) {
    const value = env[entry.key];
    if (value === undefined || value === "") continue;

    const sensitive = entry.secret || isSensitiveKey(entry.key);
    const displayValue = sensitive ? maskValue(value) : value;

    if (!checkType(value, entry.type)) {
      errors.push(
        Object.freeze({
          key: entry.key,
          message: `Expected ${typeDescription(entry.type)}, got: ${displayValue}`,
          severity: "error" as const,
          value: displayValue,
        }),
      );
      continue;
    }

    if (entry.pattern) {
      try {
        const re = new RegExp(entry.pattern);
        if (!re.test(value)) {
          errors.push(
            Object.freeze({
              key: entry.key,
              message: `Value does not match required pattern: ${entry.pattern}`,
              severity: "error" as const,
              value: displayValue,
            }),
          );
        }
      } catch {
        errors.push(
          Object.freeze({
            key: entry.key,
            message: `Schema pattern is invalid regex: ${entry.pattern}`,
            severity: "warning" as const,
          }),
        );
      }
    }

    if (entry.minLength !== undefined && value.length < entry.minLength) {
      errors.push(
        Object.freeze({
          key: entry.key,
          message: `Value too short: ${value.length} < ${entry.minLength} chars`,
          severity: "error" as const,
          value: displayValue,
        }),
      );
    }

    if (entry.maxLength !== undefined && value.length > entry.maxLength) {
      errors.push(
        Object.freeze({
          key: entry.key,
          message: `Value too long: ${value.length} > ${entry.maxLength} chars`,
          severity: "error" as const,
          value: displayValue,
        }),
      );
    }

    if (entry.allowedValues && !entry.allowedValues.includes(value)) {
      errors.push(
        Object.freeze({
          key: entry.key,
          message: `Value "${displayValue}" not in allowed set: [${entry.allowedValues.join(", ")}]`,
          severity: "error" as const,
          value: displayValue,
        }),
      );
    }
  }

  const frozen = Object.freeze(errors);
  const log = buildLog(
    SOURCE,
    `Format validation: ${schema.length} field(s) checked — ${frozen.length} format error(s)`,
  );

  const existing = state.invalid;
  const merged = Object.freeze([...existing, ...frozen]);

  return {
    nextState: transitionState(state, { invalid: merged, appendLog: log }),
    output: Object.freeze({
      success: frozen.length === 0,
      missing: Object.freeze([]),
      invalid: frozen,
      warnings: Object.freeze([]),
      logs: Object.freeze([log]),
      ...(frozen.length > 0 ? { error: "format_validation_failed" } : {}),
    }),
    formatErrors: frozen,
  };
}
