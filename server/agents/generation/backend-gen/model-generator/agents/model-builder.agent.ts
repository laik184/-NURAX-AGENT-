import type {
  ConstraintDefinition,
  FieldDefinition,
  IndexDefinition,
  ModelBuildArtifact,
  ParsedSchema,
  RelationDefinition,
} from "../types.js";

export function buildModelArtifact(
  schema: ParsedSchema,
  relations: readonly RelationDefinition[],
  constraints: readonly ConstraintDefinition[],
  indexes: readonly IndexDefinition[],
): ModelBuildArtifact {
  return Object.freeze({
    modelName: schema.modelName,
    fields: schema.fields as readonly FieldDefinition[],
    relations,
    constraints,
    indexes,
  });
}
