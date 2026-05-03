import type { GraphQLField, MutationDefinition, SchemaConfig } from "../types.js";
import { buildFieldSDL } from "../utils/sdl-builder.util.js";
import { toFieldName } from "../utils/naming.util.js";

export function generateMutations(config: SchemaConfig): {
  readonly definitions: readonly MutationDefinition[];
  readonly sdl: string;
} {
  const definitions = (config.mutations ?? []).map((mutation) => Object.freeze({
    ...mutation,
    name: toFieldName(mutation.name),
  }));

  const fields: GraphQLField[] = definitions.map((mutation) => ({
    name: mutation.name,
    type: mutation.returnType,
    args: mutation.args,
    description: mutation.description,
  }));

  const fieldSDL = fields.map((field) => buildFieldSDL(field));
  const sdl = `type Mutation {\n${fieldSDL.join("\n")}\n}`;

  return Object.freeze({ definitions: Object.freeze(definitions), sdl });
}
