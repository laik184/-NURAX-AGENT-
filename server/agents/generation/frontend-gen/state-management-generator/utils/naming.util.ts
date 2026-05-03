export function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function toCamelCase(value: string): string {
  const normalized = toKebabCase(value);

  return normalized.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function toPascalCase(value: string): string {
  const camelCase = toCamelCase(value);
  return camelCase.length === 0 ? camelCase : camelCase[0].toUpperCase() + camelCase.slice(1);
}

export function buildModuleSliceName(moduleName: string): string {
  return `${toCamelCase(moduleName)}Slice`;
}
