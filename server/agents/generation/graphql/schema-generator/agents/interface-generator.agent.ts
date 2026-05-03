import type { InterfaceDefinition, SchemaConfig } from "../types.js";
import { toTypeName } from "../utils/naming.util.js";
import { buildFieldSDL } from "../utils/sdl-builder.util.js";

export function generateInterfaces(config: SchemaConfig): {
  readonly definitions: readonly InterfaceDefinition[];
  readonly sdl: readonly string[];
} {
  const definitions = (config.interfaces ?? []).map((iface) => Object.freeze({
    ...iface,
    name: toTypeName(iface.name),
  }));

  const sdl = definitions.map((iface) => {
    const description = iface.description ? `\"\"\"${iface.description}\"\"\"\n` : "";
    const fields = iface.fields.map((field) => buildFieldSDL(field)).join("\n");
    return `${description}interface ${iface.name} {\n${fields}\n}`;
  });

  return Object.freeze({ definitions: Object.freeze(definitions), sdl: Object.freeze(sdl) });
}
