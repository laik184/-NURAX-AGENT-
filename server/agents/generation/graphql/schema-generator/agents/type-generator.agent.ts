import type { GraphQLType, SchemaConfig } from "../types.js";
import { buildFieldSDL } from "../utils/sdl-builder.util.js";
import { toTypeName } from "../utils/naming.util.js";

export function generateTypes(config: SchemaConfig): {
  readonly definitions: readonly GraphQLType[];
  readonly sdl: readonly string[];
} {
  const definitions = (config.types ?? []).map((typeDef) => Object.freeze({
    ...typeDef,
    name: toTypeName(typeDef.name),
  }));

  const sdl = definitions.map((typeDef) => {
    const header = typeDef.description ? `\"\"\"${typeDef.description}\"\"\"\n` : "";
    const implementsSDL = typeDef.implements && typeDef.implements.length > 0
      ? ` implements ${typeDef.implements.join(" & ")}`
      : "";
    const body = typeDef.fields.map((field) => buildFieldSDL(field)).join("\n");

    return `${header}type ${typeDef.name}${implementsSDL} {\n${body}\n}`;
  });

  return Object.freeze({ definitions: Object.freeze(definitions), sdl: Object.freeze(sdl) });
}
