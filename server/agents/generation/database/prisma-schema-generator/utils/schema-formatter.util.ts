import type { DatasourceConfig, EnumDefinition, FieldDefinition, GeneratorConfig, ModelDefinition } from "../types.js";

const INDENT = "  ";

export function formatComment(comment: string): string {
  return `/// ${comment}`;
}

export function formatAttribute(name: string, args?: readonly string[]): string {
  if (!args || args.length === 0) return `@${name}`;
  return `@${name}(${args.join(", ")})`;
}

export function formatField(field: FieldDefinition): string {
  const parts: string[] = [field.name];
  const typeStr = field.isList
    ? `${field.type}[]`
    : field.isOptional
    ? `${field.type}?`
    : field.type;
  parts.push(typeStr);

  for (const attr of field.attributes) {
    parts.push(formatAttribute(attr.name, attr.args));
  }

  const line = parts.join(" ");
  return field.comment ? `${INDENT}${formatComment(field.comment)}\n${INDENT}${line}` : `${INDENT}${line}`;
}

export function formatModel(model: ModelDefinition): string {
  const lines: string[] = [];
  if (model.comment) lines.push(formatComment(model.comment));
  lines.push(`model ${model.name} {`);
  for (const field of model.fields) {
    lines.push(formatField(field));
  }
  for (const attr of model.attributes) {
    lines.push(`${INDENT}${attr}`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function formatEnum(enumDef: EnumDefinition): string {
  const lines: string[] = [];
  if (enumDef.comment) lines.push(formatComment(enumDef.comment));
  lines.push(`enum ${enumDef.name} {`);
  for (const val of enumDef.values) {
    if (val.comment) lines.push(`${INDENT}${formatComment(val.comment)}`);
    lines.push(`${INDENT}${val.name}`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function formatDatasource(config: Readonly<DatasourceConfig>): string {
  const lines = [
    "datasource db {",
    `${INDENT}provider = "${config.provider}"`,
    `${INDENT}url      = env("${config.url}")`,
  ];
  if (config.shadowDatabaseUrl) {
    lines.push(`${INDENT}shadowDatabaseUrl = env("${config.shadowDatabaseUrl}")`);
  }
  if (config.relationMode) {
    lines.push(`${INDENT}relationMode = "${config.relationMode}"`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function formatGenerator(config: Readonly<GeneratorConfig>): string {
  const lines = [
    "generator client {",
    `${INDENT}provider = "${config.provider}"`,
  ];
  if (config.output) {
    lines.push(`${INDENT}output = "${config.output}"`);
  }
  if (config.previewFeatures && config.previewFeatures.length > 0) {
    const features = config.previewFeatures.map((f) => `"${f}"`).join(", ");
    lines.push(`${INDENT}previewFeatures = [${features}]`);
  }
  if (config.binaryTargets && config.binaryTargets.length > 0) {
    const targets = config.binaryTargets.map((t) => `"${t}"`).join(", ");
    lines.push(`${INDENT}binaryTargets = [${targets}]`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function assembleSchema(sections: readonly string[]): string {
  return sections.filter(Boolean).join("\n\n") + "\n";
}
