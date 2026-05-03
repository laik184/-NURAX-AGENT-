import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, IndexConfig, MongooseSchemaState } from "../types.js";
import { buildLog } from "../utils/logger.util.js";

const SOURCE = "schema-optimizer";

export interface OptimizerInput {
  readonly fields: readonly FieldDefinition[];
  readonly indexes: readonly IndexConfig[];
  readonly state: Readonly<MongooseSchemaState>;
}

export interface OptimizationReport {
  readonly removedDuplicates: number;
  readonly mergedIndexes: number;
  readonly suggestions: readonly string[];
}

function deduplicateFields(fields: readonly FieldDefinition[]): readonly FieldDefinition[] {
  const seen = new Set<string>();
  return Object.freeze(
    fields.filter((f) => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    }),
  );
}

function mergeRedundantIndexes(indexes: readonly IndexConfig[]): readonly IndexConfig[] {
  const seen = new Set<string>();
  return Object.freeze(
    indexes.filter((idx) => {
      const key = JSON.stringify(idx.fields);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

function generateSuggestions(fields: readonly FieldDefinition[]): readonly string[] {
  const suggestions: string[] = [];

  const hasCreatedAt = fields.some((f) => f.name === "createdAt");
  const hasUpdatedAt = fields.some((f) => f.name === "updatedAt");
  if (!hasCreatedAt || !hasUpdatedAt) {
    suggestions.push("Consider enabling timestamps: true in schema options for automatic createdAt/updatedAt");
  }

  const largeStringFields = fields.filter(
    (f) => f.type === "String" && !f.validation?.maxLength && !f.validation?.range?.maxLength,
  );
  if (largeStringFields.length > 0) {
    suggestions.push(`Consider adding maxlength validation to: ${largeStringFields.map((f) => f.name).join(", ")}`);
  }

  const unindexedRefs = fields.filter((f) => f.ref && !f.validation?.unique);
  if (unindexedRefs.length > 0) {
    suggestions.push(`Consider indexing reference fields: ${unindexedRefs.map((f) => f.name).join(", ")}`);
  }

  return Object.freeze(suggestions);
}

export function optimizeSchema(
  input: OptimizerInput,
): Readonly<AgentResult & { optimizedFields?: readonly FieldDefinition[]; optimizedIndexes?: readonly IndexConfig[]; report?: OptimizationReport }> {
  const { fields, indexes, state } = input;

  const deduped = deduplicateFields(fields);
  const mergedIndexes = mergeRedundantIndexes(indexes);
  const suggestions = generateSuggestions(deduped);

  const report: OptimizationReport = Object.freeze({
    removedDuplicates: fields.length - deduped.length,
    mergedIndexes: indexes.length - mergedIndexes.length,
    suggestions,
  });

  const log = buildLog(
    SOURCE,
    `Optimization complete: removed ${report.removedDuplicates} duplicates, merged ${report.mergedIndexes} indexes, ${suggestions.length} suggestion(s)`,
  );

  return {
    nextState: transitionState(state, {
      fields: deduped,
      indexes: mergedIndexes,
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      schema: "",
      indexes: mergedIndexes,
      logs: Object.freeze([log]),
    }),
    optimizedFields: deduped,
    optimizedIndexes: mergedIndexes,
    report,
  };
}
