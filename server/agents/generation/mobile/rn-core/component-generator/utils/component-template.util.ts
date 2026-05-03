function serializeValue(value: unknown): string {
  if (typeof value === "string") return `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entryValue]) => `${key}: ${serializeValue(entryValue)}`,
    );
    return `{ ${entries.join(", ")} }`;
  }
  return "undefined";
}

export function buildPropSpread(props: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(props)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}={${serializeValue(value)}}`);

  return entries.length > 0 ? ` ${entries.join(" ")}` : "";
}

export function buildComponentTemplate(
  tagName: string,
  props: Readonly<Record<string, unknown>>,
  children?: string,
): string {
  const propSpread = buildPropSpread(props);

  if (children && children.length > 0) {
    return `<${tagName}${propSpread}>${children}</${tagName}>`;
  }

  return `<${tagName}${propSpread} />`;
}
