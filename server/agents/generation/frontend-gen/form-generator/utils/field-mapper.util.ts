import type { FieldConfig } from "../types.js";

export function toFieldDefaultValue(field: FieldConfig): string {
  if (typeof field.defaultValue === "boolean") {
    return field.defaultValue ? "true" : "false";
  }
  if (typeof field.defaultValue === "number") {
    return String(field.defaultValue);
  }
  if (typeof field.defaultValue === "string") {
    return JSON.stringify(field.defaultValue);
  }
  return field.type === "checkbox" ? "false" : "\"\"";
}

export function toSectionKey(field: FieldConfig): string {
  return field.section?.trim() || "default";
}
