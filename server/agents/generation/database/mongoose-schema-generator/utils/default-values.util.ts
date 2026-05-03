export function formatDefaultValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") {
    if (value === "Date.now" || value === "now") return "Date.now";
    if (value === "uuid" || value === "uuidv4") return "() => require('crypto').randomUUID()";
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return "[]";
  if (typeof value === "object") return "{}";
  return JSON.stringify(value);
}

export function hasDefault(value: unknown): boolean {
  return value !== undefined;
}

export function inferDefaultFromType(mongooseType: string): string | null {
  switch (mongooseType) {
    case "String": return null;
    case "Number": return null;
    case "Boolean": return "false";
    case "Date": return null;
    default: return null;
  }
}
