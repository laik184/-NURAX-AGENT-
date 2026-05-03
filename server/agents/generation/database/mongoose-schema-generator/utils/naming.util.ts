export function toPascalCase(input: string): string {
  return input
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase());
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toCollectionName(modelName: string): string {
  const camel = toCamelCase(modelName);
  if (camel.endsWith("y") && !/[aeiou]y$/i.test(camel)) {
    return camel.slice(0, -1) + "ies";
  }
  if (/s|x|z|ch|sh$/i.test(camel)) return camel + "es";
  return camel + "s";
}

export function toSchemaVarName(modelName: string): string {
  return `${toPascalCase(modelName)}Schema`;
}

export function toModelVarName(modelName: string): string {
  return toPascalCase(modelName);
}
