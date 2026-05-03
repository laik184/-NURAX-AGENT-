export function toPascalCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z\d]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function toKebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z\d]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : "";
}

export function makePropsInterfaceName(componentName: string): string {
  return `${toPascalCase(componentName)}Props`;
}
