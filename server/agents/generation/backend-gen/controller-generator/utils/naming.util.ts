export function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  if (!pascal) return "";
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function buildControllerFileName(controllerName: string): string {
  return `${toCamelCase(controllerName)}.controller.ts`;
}
