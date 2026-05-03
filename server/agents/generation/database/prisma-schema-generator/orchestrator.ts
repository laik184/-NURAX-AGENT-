import { buildDatasourceConfig } from "./agents/datasource-config.agent.js";
import { buildEnums } from "./agents/enum-builder.agent.js";
import { buildGeneratorConfig } from "./agents/generator-config.agent.js";
import { buildModels } from "./agents/model-builder.agent.js";
import { buildRelations } from "./agents/relation-builder.agent.js";
import { validateSchema } from "./agents/validation.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type { AgentResult, GenerationInput, SchemaGeneratorState } from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";
import { assembleSchema, formatEnum, formatModel } from "./utils/schema-formatter.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<SchemaGeneratorState>,
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
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function generateSchemaOrchestrator(
  input: GenerationInput,
  currentState: Readonly<SchemaGeneratorState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  const datasourceResult = buildDatasourceConfig({
    config: input.datasource,
    state,
  });
  state = datasourceResult.nextState;
  if (!datasourceResult.output.success) return datasourceResult;

  const generatorResult = buildGeneratorConfig({
    config: input.generator,
    state,
  });
  state = generatorResult.nextState;
  if (!generatorResult.output.success) return generatorResult;

  const enumResult = buildEnums({
    enums: input.enums ?? [],
    state,
  });
  state = enumResult.nextState;
  if (!enumResult.output.success) return enumResult;

  const modelResult = buildModels({
    models: input.models,
    state,
  });
  state = modelResult.nextState;
  if (!modelResult.output.success) return modelResult;

  const relationResult = buildRelations({
    relations: input.relations ?? [],
    models: state.models,
    state,
  });
  state = relationResult.nextState;
  if (!relationResult.output.success) return relationResult;

  const validationResult = validateSchema({ state });
  state = validationResult.nextState;
  if (!validationResult.valid) return validationResult;

  const modelBlocks = state.models.map(formatModel);
  const enumBlocks = state.enums.map((e) => formatEnum(e));

  const schema = assembleSchema([
    datasourceResult.block ?? "",
    generatorResult.block ?? "",
    ...enumBlocks,
    ...modelBlocks,
  ]);

  const log = buildLog(SOURCE, `Schema generated: ${state.models.length} model(s), ${state.enums.length} enum(s), ${state.relations.length} relation(s)`);

  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({
      success: true,
      schema,
      logs: Object.freeze([log]),
    }),
  };
}

export function validateSchemaOrchestrator(
  input: GenerationInput,
  currentState: Readonly<SchemaGeneratorState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  const modelResult = buildModels({ models: input.models, state });
  state = modelResult.nextState;
  if (!modelResult.output.success) return modelResult;

  const relationResult = buildRelations({
    relations: input.relations ?? [],
    models: state.models,
    state,
  });
  state = relationResult.nextState;

  const enumResult = buildEnums({ enums: input.enums ?? [], state });
  state = enumResult.nextState;

  return validateSchema({ state });
}
