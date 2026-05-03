export function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toLowerCase();
}

export function formatDefaultValue(value: string | number | boolean | null | undefined): string {
  if (value === undefined) {
    return "";
  }

  if (value === null) {
    return " DEFAULT NULL";
  }

  if (typeof value === "string") {
    return ` DEFAULT '${value}'`;
  }

  if (typeof value === "boolean") {
    return ` DEFAULT ${value ? "TRUE" : "FALSE"}`;
  }

  return ` DEFAULT ${value}`;
}
