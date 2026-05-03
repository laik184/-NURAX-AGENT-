import type { ConstraintDefinition, ParsedSchema } from "../types.js";

export function buildConstraints(schema: ParsedSchema): readonly ConstraintDefinition[] {
  return Object.freeze(
    schema.fields
      .filter((field) => field.primary || field.unique || field.required)
      .map((field) => ({
        field: field.name,
        primary: Boolean(field.primary),
        unique: Boolean(field.unique),
        required: Boolean(field.required),
      })),
  );
}
