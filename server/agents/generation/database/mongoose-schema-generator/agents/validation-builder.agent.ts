import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, MongooseSchemaState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";

const SOURCE = "validation-builder";

export interface ValidationBuilderInput {
  readonly fields: readonly FieldDefinition[];
  readonly state: Readonly<MongooseSchemaState>;
}

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
  readonly level: "ERROR" | "WARNING";
}

export function buildValidations(
  input: ValidationBuilderInput,
): Readonly<AgentResult & { issues?: readonly ValidationIssue[] }> {
  const { fields, state } = input;
  const issues: ValidationIssue[] = [];

  for (const field of fields) {
    if (!field.name || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field.name)) {
      issues.push(Object.freeze({
        field: field.name,
        message: `Invalid field name: "${field.name}"`,
        level: "ERROR",
      }));
    }

    if (field.validation?.enum && field.validation.enum.values.length === 0) {
      issues.push(Object.freeze({
        field: field.name,
        message: `Enum for "${field.name}" has no values`,
        level: "ERROR",
      }));
    }

    const range = field.validation?.range;
    if (range) {
      if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
        issues.push(Object.freeze({
          field: field.name,
          message: `min (${range.min}) > max (${range.max}) for field "${field.name}"`,
          level: "ERROR",
        }));
      }
      if (range.minLength !== undefined && range.maxLength !== undefined && range.minLength > range.maxLength) {
        issues.push(Object.freeze({
          field: field.name,
          message: `minLength (${range.minLength}) > maxLength (${range.maxLength}) for field "${field.name}"`,
          level: "ERROR",
        }));
      }
    }

    if (field.type === "ObjectId" && !field.ref) {
      issues.push(Object.freeze({
        field: field.name,
        message: `ObjectId field "${field.name}" has no ref — consider adding a ref for population`,
        level: "WARNING",
      }));
    }
  }

  const errors = issues.filter((i) => i.level === "ERROR");
  if (errors.length > 0) {
    const msg = `Validation errors: ${errors.map((e) => e.message).join("; ")}`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", indexes: Object.freeze([]), logs: Object.freeze([buildLog(SOURCE, msg)]), error: "validation_failed" }),
      issues: Object.freeze(issues),
    };
  }

  const log = buildLog(SOURCE, `Validation passed: ${fields.length} fields, ${issues.filter((i) => i.level === "WARNING").length} warnings`);
  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({ success: true, schema: "", indexes: Object.freeze([]), logs: Object.freeze([log]) }),
    issues: Object.freeze(issues),
  };
}
