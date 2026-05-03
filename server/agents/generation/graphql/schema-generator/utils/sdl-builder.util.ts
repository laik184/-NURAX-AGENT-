import type { GraphQLField } from "../types.js";

function buildTypeAnnotation(field: GraphQLField): string {
  const baseType = field.required ? `${field.type}!` : field.type;
  if (!field.isList) return baseType;

  const itemType = field.listRequired ? `${field.type}!` : field.type;
  const listType = `[${itemType}]`;
  return field.required ? `${listType}!` : listType;
}

export function buildArgSDL(field: GraphQLField): string {
  return `${field.name}: ${buildTypeAnnotation(field)}`;
}

export function buildFieldSDL(field: GraphQLField): string {
  const args = field.args && field.args.length > 0
    ? `(${field.args.map((arg) => buildArgSDL(arg)).join(", ")})`
    : "";

  const description = field.description ? `  \"\"\"${field.description}\"\"\"\n` : "";
  return `${description}  ${field.name}${args}: ${buildTypeAnnotation(field)}`;
}

export function block(name: string, lines: readonly string[]): string {
  return `type ${name} {\n${lines.join("\n")}\n}`;
}
