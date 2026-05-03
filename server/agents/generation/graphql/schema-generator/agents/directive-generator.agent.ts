import type { DirectiveDefinition, GraphQLField, SchemaConfig } from "../types.js";
import { toFieldName } from "../utils/naming.util.js";
import { buildArgSDL } from "../utils/sdl-builder.util.js";

function toFieldArg(arg: { readonly name: string; readonly type: string; readonly required?: boolean }): GraphQLField {
  return {
    name: toFieldName(arg.name),
    type: arg.type,
    required: arg.required,
  };
}

export function generateDirectives(config: SchemaConfig): {
  readonly definitions: readonly DirectiveDefinition[];
  readonly sdl: readonly string[];
} {
  const definitions = (config.directives ?? []).map((directive) => Object.freeze({
    ...directive,
    name: toFieldName(directive.name),
  }));

  const sdl = definitions.map((directive) => {
    const description = directive.description ? `\"\"\"${directive.description}\"\"\"\n` : "";
    const args = directive.args && directive.args.length > 0
      ? `(${directive.args.map((arg) => buildArgSDL(toFieldArg(arg))).join(", ")})`
      : "";

    return `${description}directive @${directive.name}${args} on ${directive.locations.join(" | ")}`;
  });

  return Object.freeze({ definitions: Object.freeze(definitions), sdl: Object.freeze(sdl) });
}
