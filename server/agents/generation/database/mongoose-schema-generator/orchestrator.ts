import { buildFinalSchema } from "./agents/schema-builder.agent.js";
import { mapFields } from "./agents/field-mapper.agent.js";
import { mapRelations } from "./agents/relation-mapper.agent.js";
import { buildValidations } from "./agents/validation-builder.agent.js";
import { buildIndexes } from "./agents/index-builder.agent.js";
import { optimizeSchema } from "./agents/schema-optimizer.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type { AgentResult, MongooseSchemaState, SchemaConfig, SchemaResult } from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";
import { toSchemaVarName } from "./utils/naming.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<MongooseSchemaState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "FAILED",
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      schema: "",
      indexes: Object.freeze([]),
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function generateSchemaOrchestrator(
  config: Readonly<SchemaConfig>,
  currentState: Readonly<MongooseSchemaState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = transitionState(currentState, { status: "GENERATING" });

  // Step 1: Map fields (JS types → Mongoose types)
  const fieldResult = mapFields({ config, state });
  state = fieldResult.nextState;
  if (!fieldResult.output.success) return fieldResult;
  const mappedFields = fieldResult.mappedFields ?? [];

  // Step 2: Map relations (refs + population config)
  const relationResult = mapRelations({
    relations: config.relations ?? [],
    state,
  });
  state = relationResult.nextState;
  if (!relationResult.output.success) return relationResult;
  const mappedRelations = relationResult.mappedRelations ?? [];

  // Step 3: Build & validate field rules
  const validationResult = buildValidations({ fields: config.fields, state });
  state = validationResult.nextState;
  if (!validationResult.output.success) return validationResult;

  // Step 4: Build indexes (infer from unique fields + explicit)
  const schemaVar = toSchemaVarName(config.name);
  const indexResult = buildIndexes({
    fields: config.fields,
    explicitIndexes: config.indexes ?? [],
    schemaVar,
    state,
  });
  state = indexResult.nextState;
  if (!indexResult.output.success) return indexResult;

  // Step 5: Optimize schema (remove redundancy, merge indexes, suggest improvements)
  const optimizerResult = optimizeSchema({
    fields: config.fields,
    indexes: indexResult.allIndexes ?? [],
    state,
  });
  state = optimizerResult.nextState;
  if (!optimizerResult.output.success) return optimizerResult;

  const optimizedFields = optimizerResult.optimizedFields ?? mappedFields.map((m) => m.definition);
  const optimizedIndexes = optimizerResult.optimizedIndexes ?? [];

  // Re-run field mapper with optimized fields to get schemaLines
  const finalFieldResult = mapFields({
    config: Object.freeze({ ...config, fields: optimizedFields }),
    state,
  });
  state = finalFieldResult.nextState;
  const finalMappedFields = finalFieldResult.mappedFields ?? mappedFields;

  // Step 6: Build final mongoose Schema()
  const schemaResult = buildFinalSchema({
    config,
    mappedFields: finalMappedFields,
    mappedRelations,
    allIndexes: optimizedIndexes,
    state,
  });
  state = schemaResult.nextState;

  return schemaResult;
}

export function validateSchemaOrchestrator(
  config: Readonly<SchemaConfig>,
  currentState: Readonly<MongooseSchemaState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  const fieldResult = mapFields({ config, state });
  state = fieldResult.nextState;
  if (!fieldResult.output.success) return fieldResult;

  const validationResult = buildValidations({ fields: config.fields, state });
  state = validationResult.nextState;
  return validationResult;
}

export function optimizeSchemaOrchestrator(
  config: Readonly<SchemaConfig>,
  currentState: Readonly<MongooseSchemaState> = INITIAL_STATE,
): Readonly<AgentResult & { report?: object }> {
  let state = currentState;

  const fieldResult = mapFields({ config, state });
  state = fieldResult.nextState;
  if (!fieldResult.output.success) return fieldResult;

  const indexResult = buildIndexes({
    fields: config.fields,
    explicitIndexes: config.indexes ?? [],
    schemaVar: toSchemaVarName(config.name),
    state,
  });
  state = indexResult.nextState;

  const optimizerResult = optimizeSchema({
    fields: config.fields,
    indexes: indexResult.allIndexes ?? [],
    state,
  });

  return { ...optimizerResult, report: optimizerResult.report };
}
