import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, IndexConfig, MongooseSchemaState } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { formatIndexCall } from "../utils/schema-format.util.js";

const SOURCE = "index-builder";

export interface IndexBuilderInput {
  readonly fields: readonly FieldDefinition[];
  readonly explicitIndexes?: readonly IndexConfig[];
  readonly schemaVar: string;
  readonly state: Readonly<MongooseSchemaState>;
}

function inferIndexesFromFields(fields: readonly FieldDefinition[]): IndexConfig[] {
  const indexes: IndexConfig[] = [];

  for (const field of fields) {
    if (field.validation?.unique && field.name !== "_id") {
      indexes.push(Object.freeze({
        fields: Object.freeze({ [field.name]: 1 as const }),
        unique: true,
        background: true,
        name: `${field.name}_unique`,
      }));
    }
  }

  return indexes;
}

export function buildIndexes(
  input: IndexBuilderInput,
): Readonly<AgentResult & { indexLines?: readonly string[]; allIndexes?: readonly IndexConfig[] }> {
  const { fields, explicitIndexes = [], schemaVar, state } = input;

  const inferred = inferIndexesFromFields(fields);
  const allIndexes: readonly IndexConfig[] = Object.freeze([...inferred, ...explicitIndexes]);

  const seen = new Set<string>();
  const deduped = allIndexes.filter((idx) => {
    const key = JSON.stringify(idx.fields);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const indexLines = Object.freeze(deduped.map((idx) => formatIndexCall(schemaVar, idx)));
  const log = buildLog(SOURCE, `${deduped.length} index(es) built (${inferred.length} inferred, ${explicitIndexes.length} explicit)`);

  return {
    nextState: transitionState(state, {
      indexes: deduped,
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      schema: "",
      indexes: Object.freeze([...deduped]),
      logs: Object.freeze([log]),
    }),
    indexLines,
    allIndexes: Object.freeze(deduped),
  };
}
