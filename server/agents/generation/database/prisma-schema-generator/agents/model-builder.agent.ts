import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, ModelDefinition, SchemaGeneratorState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { toPascalCase } from "../utils/naming.util.js";
import { formatModel } from "../utils/schema-formatter.util.js";

const SOURCE = "model-builder";

const ID_FIELD: Readonly<FieldDefinition> = Object.freeze({
  name: "id",
  type: "String",
  isOptional: false,
  isList: false,
  attributes: Object.freeze([
    Object.freeze({ name: "id" }),
    Object.freeze({ name: "default", args: Object.freeze(["cuid()"]) }),
  ]),
});

const CREATED_AT_FIELD: Readonly<FieldDefinition> = Object.freeze({
  name: "createdAt",
  type: "DateTime",
  isOptional: false,
  isList: false,
  attributes: Object.freeze([Object.freeze({ name: "default", args: Object.freeze(["now()"]) })]),
});

const UPDATED_AT_FIELD: Readonly<FieldDefinition> = Object.freeze({
  name: "updatedAt",
  type: "DateTime",
  isOptional: false,
  isList: false,
  attributes: Object.freeze([Object.freeze({ name: "updatedAt" })]),
});

export interface ModelBuilderInput {
  readonly models: readonly ModelDefinition[];
  readonly state: Readonly<SchemaGeneratorState>;
  readonly injectTimestamps?: boolean;
}

function ensureIdField(model: ModelDefinition): ModelDefinition {
  const hasId = model.fields.some((f) => f.attributes.some((a) => a.name === "id"));
  if (hasId) return model;
  return Object.freeze({ ...model, fields: Object.freeze([ID_FIELD, ...model.fields]) });
}

function ensureTimestamps(model: ModelDefinition): ModelDefinition {
  const hasCreatedAt = model.fields.some((f) => f.name === "createdAt");
  const hasUpdatedAt = model.fields.some((f) => f.name === "updatedAt");
  const extra: FieldDefinition[] = [];
  if (!hasCreatedAt) extra.push(CREATED_AT_FIELD);
  if (!hasUpdatedAt) extra.push(UPDATED_AT_FIELD);
  if (extra.length === 0) return model;
  return Object.freeze({ ...model, fields: Object.freeze([...model.fields, ...extra]) });
}

export function buildModels(
  input: ModelBuilderInput,
): Readonly<AgentResult & { blocks?: readonly string[] }> {
  const { models, state, injectTimestamps = true } = input;

  if (models.length === 0) {
    const msg = "No models provided for schema generation";
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", logs: Object.freeze([buildLog(SOURCE, msg)]), error: "no_models" }),
    };
  }

  const built: ModelDefinition[] = [];

  for (const raw of models) {
    let model: ModelDefinition = Object.freeze({ ...raw, name: toPascalCase(raw.name) });
    model = ensureIdField(model);
    if (injectTimestamps) model = ensureTimestamps(model);
    built.push(model);
  }

  const blocks = Object.freeze(built.map(formatModel));
  const log = buildLog(SOURCE, `${built.length} model(s) built: ${built.map((m) => m.name).join(", ")}`);

  return {
    nextState: transitionState(state, {
      status: "GENERATING",
      models: built,
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: blocks.join("\n\n"), logs: Object.freeze([log]) }),
    blocks,
  };
}
