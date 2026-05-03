import type { IndexDefinition, ParsedSchema } from "../types.js";

export function buildIndexes(schema: ParsedSchema): readonly IndexDefinition[] {
  const uniqueFieldIndexes: IndexDefinition[] = schema.fields
    .filter((field) => field.unique)
    .map((field) => ({
      name: `idx_${schema.modelName.toLowerCase()}_${field.name}`,
      fields: [field.name],
      unique: true,
    }));

  return Object.freeze([...schema.indexes, ...uniqueFieldIndexes]);
}
