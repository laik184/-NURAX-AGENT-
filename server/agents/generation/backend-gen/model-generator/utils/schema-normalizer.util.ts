import type {
  FieldDefinition,
  IndexDefinition,
  ModelSchema,
  ParsedSchema,
  RelationDefinition,
} from "../types.js";
import { toCamelCase, toPascalCase } from "./naming.util.js";

function normalizeField(field: FieldDefinition): FieldDefinition {
  return {
    ...field,
    name: toCamelCase(field.name),
    type: field.type.trim().toLowerCase(),
  };
}

function normalizeRelation(relation: RelationDefinition): RelationDefinition {
  return {
    ...relation,
    name: toCamelCase(relation.name),
    target: toPascalCase(relation.target),
  };
}

function normalizeIndex(index: IndexDefinition): IndexDefinition {
  return {
    ...index,
    fields: index.fields.map((field) => toCamelCase(field)),
  };
}

export function normalizeSchema(schema: ModelSchema): ParsedSchema {
  return Object.freeze({
    modelName: toPascalCase(schema.name),
    fields: Object.freeze(schema.fields.map(normalizeField)),
    relations: Object.freeze((schema.relations ?? []).map(normalizeRelation)),
    indexes: Object.freeze((schema.indexes ?? []).map(normalizeIndex)),
  });
}
