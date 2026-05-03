import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, ModelDefinition, RelationDefinition, SchemaGeneratorState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import {
  buildManyToManyFields,
  buildOneToManyFields,
  buildOneToOneFields,
} from "../utils/relation-mapper.util.js";

const SOURCE = "relation-builder";

export interface RelationBuilderInput {
  readonly relations: readonly RelationDefinition[];
  readonly models: readonly ModelDefinition[];
  readonly state: Readonly<SchemaGeneratorState>;
}

function addFieldsToModel(
  model: ModelDefinition,
  fields: readonly FieldDefinition[],
): ModelDefinition {
  const existingNames = new Set(model.fields.map((f) => f.name));
  const newFields = fields.filter((f) => !existingNames.has(f.name));
  return Object.freeze({ ...model, fields: Object.freeze([...model.fields, ...newFields]) });
}

export function buildRelations(
  input: RelationBuilderInput,
): Readonly<AgentResult & { updatedModels?: readonly ModelDefinition[] }> {
  const { relations, state } = input;

  if (relations.length === 0) {
    const log = buildLog(SOURCE, "No relations to process");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, schema: "", logs: Object.freeze([log]) }),
      updatedModels: state.models,
    };
  }

  let modelMap = new Map<string, ModelDefinition>(state.models.map((m) => [m.name, m]));
  const errors: string[] = [];

  for (const rel of relations) {
    const fromModel = modelMap.get(rel.fromModel);
    const toModel = modelMap.get(rel.toModel);

    if (!fromModel) { errors.push(`Relation references unknown model: ${rel.fromModel}`); continue; }
    if (!toModel) { errors.push(`Relation references unknown model: ${rel.toModel}`); continue; }

    let ownerFields: readonly FieldDefinition[];
    let referenceFields: readonly FieldDefinition[];

    if (rel.type === "one-to-one") {
      ({ ownerFields, referenceFields } = buildOneToOneFields(rel));
    } else if (rel.type === "one-to-many") {
      ({ ownerFields, referenceFields } = buildOneToManyFields(rel));
    } else {
      ({ ownerFields, referenceFields } = buildManyToManyFields(rel));
    }

    modelMap.set(rel.fromModel, addFieldsToModel(fromModel, ownerFields));
    modelMap.set(rel.toModel, addFieldsToModel(toModel, referenceFields));
  }

  if (errors.length > 0) {
    const msg = `Relation errors: ${errors.join("; ")}`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", logs: Object.freeze([buildLog(SOURCE, msg)]), error: "invalid_relation" }),
    };
  }

  const updatedModels = Object.freeze([...modelMap.values()]);
  const log = buildLog(SOURCE, `${relations.length} relation(s) applied to models`);

  return {
    nextState: transitionState(state, {
      relations: Object.freeze([...relations]),
      models: updatedModels,
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: "", logs: Object.freeze([log]) }),
    updatedModels,
  };
}
