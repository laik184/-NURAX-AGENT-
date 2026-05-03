import type { GraphQLField, QueryDefinition, SchemaConfig } from "../types.js";
import { buildFieldSDL } from "../utils/sdl-builder.util.js";
import { toFieldName } from "../utils/naming.util.js";

export function generateQueries(config: SchemaConfig): {
  readonly definitions: readonly QueryDefinition[];
  readonly sdl: string;
} {
  const definitions = (config.queries ?? []).map((query) => Object.freeze({
    ...query,
    name: toFieldName(query.name),
  }));

  const fields: GraphQLField[] = definitions.map((query) => ({
    name: query.name,
    type: query.returnType,
    args: query.args,
    description: query.description,
  }));

  const fieldSDL = fields.map((field) => buildFieldSDL(field));
  const sdl = `type Query {\n${fieldSDL.join("\n")}\n}`;

  return Object.freeze({ definitions: Object.freeze(definitions), sdl });
}
