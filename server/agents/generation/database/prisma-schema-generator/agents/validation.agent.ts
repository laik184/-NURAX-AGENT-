import { transitionState } from "../state.js";
import type { AgentResult, ModelDefinition, SchemaGeneratorState, ValidationIssue } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";

const SOURCE = "validation";

export interface ValidationInput {
  readonly state: Readonly<SchemaGeneratorState>;
}

function validateModel(model: ModelDefinition): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const hasId = model.fields.some((f) => f.attributes.some((a) => a.name === "id"));
  if (!hasId) {
    issues.push(Object.freeze({
      field: `${model.name}.id`,
      message: `Model "${model.name}" has no @id field`,
      level: "ERROR",
    }));
  }

  const fieldNames = model.fields.map((f) => f.name);
  const duplicates = fieldNames.filter((n, i) => fieldNames.indexOf(n) !== i);
  if (duplicates.length > 0) {
    issues.push(Object.freeze({
      field: model.name,
      message: `Duplicate field names in "${model.name}": ${[...new Set(duplicates)].join(", ")}`,
      level: "ERROR",
    }));
  }

  for (const field of model.fields) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      issues.push(Object.freeze({
        field: `${model.name}.${field.name}`,
        message: `Invalid field name: "${field.name}"`,
        level: "ERROR",
      }));
    }
  }

  return Object.freeze(issues);
}

export function validateSchema(input: ValidationInput): Readonly<AgentResult & { issues?: readonly ValidationIssue[]; valid?: boolean }> {
  const { state } = input;
  const allIssues: ValidationIssue[] = [];

  if (state.models.length === 0) {
    allIssues.push(Object.freeze({
      field: "schema",
      message: "Schema must have at least one model",
      level: "ERROR",
    }));
  }

  for (const model of state.models) {
    allIssues.push(...validateModel(model));
  }

  const relModelNames = new Set(state.models.map((m) => m.name));
  for (const rel of state.relations) {
    if (!relModelNames.has(rel.fromModel)) {
      allIssues.push(Object.freeze({
        field: `relation.${rel.fromModel}`,
        message: `Relation references unknown model: ${rel.fromModel}`,
        level: "ERROR",
      }));
    }
    if (!relModelNames.has(rel.toModel)) {
      allIssues.push(Object.freeze({
        field: `relation.${rel.toModel}`,
        message: `Relation references unknown model: ${rel.toModel}`,
        level: "ERROR",
      }));
    }
  }

  const enumNames = new Set(state.enums.map((e) => e.name));
  for (const model of state.models) {
    for (const field of model.fields) {
      if (
        !["String", "Int", "BigInt", "Float", "Decimal", "Boolean", "DateTime", "Json", "Bytes"].includes(field.type) &&
        !relModelNames.has(field.type) &&
        !enumNames.has(field.type)
      ) {
        allIssues.push(Object.freeze({
          field: `${model.name}.${field.name}`,
          message: `Unknown type "${field.type}" — not a scalar, model, or enum`,
          level: "WARNING",
        }));
      }
    }
  }

  const errors = allIssues.filter((i) => i.level === "ERROR");
  const valid = errors.length === 0;
  const log = buildLog(SOURCE, `Validation: valid=${valid} errors=${errors.length} warnings=${allIssues.length - errors.length}`);

  if (!valid) {
    const msg = `Schema validation failed: ${errors.map((e) => e.message).join("; ")}`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: log,
      }),
      output: Object.freeze({ success: false, schema: "", logs: Object.freeze([log]), error: "validation_failed" }),
      issues: Object.freeze(allIssues),
      valid: false,
    };
  }

  return {
    nextState: transitionState(state, {
      status: "SUCCESS",
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: "", logs: Object.freeze([log]) }),
    issues: Object.freeze(allIssues),
    valid: true,
  };
}
