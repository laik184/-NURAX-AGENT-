import type { SchemaFieldType } from "../types.js";

const ARRAY_SUFFIX = "[]";

export function mapTypeToOpenApi(typeName: string): { readonly type: SchemaFieldType } {
  const normalized = typeName.trim().toLowerCase();
  if (normalized.endsWith(ARRAY_SUFFIX) || normalized.startsWith("array<")) {
    return { type: "array" };
  }

  if (["string", "uuid", "date"].includes(normalized)) {
    return { type: "string" };
  }

  if (["number", "int", "float", "double"].includes(normalized)) {
    return { type: "number" };
  }

  if (["boolean", "bool"].includes(normalized)) {
    return { type: "boolean" };
  }

  if (["object", "record"].some((item) => normalized.startsWith(item))) {
    return { type: "object" };
  }

  return { type: "unknown" };
}
