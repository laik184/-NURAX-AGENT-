import type { ParsedSchema, RelationDefinition } from "../types.js";

export function mapRelations(schema: ParsedSchema): readonly RelationDefinition[] {
  return Object.freeze(
    schema.relations.map((relation) => ({
      ...relation,
      foreignKey: relation.foreignKey ?? `${relation.name}Id`,
    })),
  );
}
