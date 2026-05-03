export function toPascalCase(input: string): string {
  return input
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase());
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(input: string): string {
  return input
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function pluralize(word: string): string {
  if (word.endsWith("y") && !/[aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + "ies";
  }
  if (/s|x|z|ch|sh$/i.test(word)) return word + "es";
  return word + "s";
}

export function toRelationFieldName(modelName: string): string {
  return toCamelCase(modelName);
}

export function toForeignKeyName(modelName: string, fieldName: string = "id"): string {
  return `${toCamelCase(modelName)}${toPascalCase(fieldName)}`;
}

export function toJunctionTableName(modelA: string, modelB: string): string {
  const sorted = [toPascalCase(modelA), toPascalCase(modelB)].sort();
  return `_${sorted[0]}To${sorted[1]}`;
}
