import type { SchemaConfig } from "../types.js";
import { toTypeName } from "../utils/naming.util.js";

export function generateScalars(config: SchemaConfig): readonly string[] {
  const scalars = (config.scalars ?? []).map((scalar) => `scalar ${toTypeName(scalar)}`);
  return Object.freeze(scalars);
}
