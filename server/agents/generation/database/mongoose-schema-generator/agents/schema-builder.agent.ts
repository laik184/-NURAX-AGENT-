import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, IndexConfig, MongooseSchemaState, RelationDefinition, SchemaConfig } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { toSchemaVarName, toModelVarName, toCollectionName } from "../utils/naming.util.js";
import {
  buildImportBlock,
  buildSchemaOptions,
  formatIndexCall,
} from "../utils/schema-format.util.js";
import type { MappedField } from "./field-mapper.agent.js";
import type { MappedRelation } from "./relation-mapper.agent.js";

const SOURCE = "schema-builder";

export interface SchemaBuilderInput {
  readonly config: Readonly<SchemaConfig>;
  readonly mappedFields: readonly MappedField[];
  readonly mappedRelations: readonly MappedRelation[];
  readonly allIndexes: readonly IndexConfig[];
  readonly state: Readonly<MongooseSchemaState>;
}

export function buildFinalSchema(
  input: SchemaBuilderInput,
): Readonly<AgentResult> {
  const { config, mappedFields, mappedRelations, allIndexes, state } = input;

  if (mappedFields.length === 0 && mappedRelations.length === 0) {
    const msg = `Cannot build empty schema for "${config.name}"`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", indexes: Object.freeze([]), logs: Object.freeze([buildLog(SOURCE, msg)]), error: "empty_schema" }),
    };
  }

  const schemaVar = toSchemaVarName(config.name);
  const modelVar = toModelVarName(config.name);
  const refModels = mappedRelations.map((r) => r.relation.refModel);
  const importBlock = buildImportBlock(refModels);

  const fieldLines: string[] = [];

  for (const mf of mappedFields) {
    const line = `  ${mf.definition.name}: ${mf.schemaLine},`;
    fieldLines.push(mf.definition.comment ? `  // ${mf.definition.comment}\n${line}` : line);
  }

  for (const mr of mappedRelations) {
    fieldLines.push(`  ${mr.relation.fieldName}: ${mr.schemaLine},`);
  }

  const schemaOptions = buildSchemaOptions({
    timestamps: config.timestamps !== false,
    strict: config.strict,
    versionKey: config.versionKey,
    collection: config.collection ?? toCollectionName(config.name),
  });

  const schemaBody = fieldLines.join("\n");
  const schemaBlock = `const ${schemaVar} = new Schema({\n${schemaBody}\n}${schemaOptions});`;

  const indexLines = allIndexes.map((idx) => formatIndexCall(schemaVar, idx));

  const modelExport = `export const ${modelVar} = model("${modelVar}", ${schemaVar});`;

  const sections = [
    importBlock,
    "",
    schemaBlock,
    ...(indexLines.length > 0 ? ["", ...indexLines] : []),
    "",
    modelExport,
    "",
  ];

  const schema = sections.join("\n");
  const log = buildLog(SOURCE, `Schema built for "${config.name}": ${mappedFields.length} fields, ${mappedRelations.length} relations, ${allIndexes.length} indexes`);

  return {
    nextState: transitionState(state, {
      status: "COMPLETE",
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      schema,
      indexes: Object.freeze([...allIndexes]),
      logs: Object.freeze([log]),
    }),
  };
}
