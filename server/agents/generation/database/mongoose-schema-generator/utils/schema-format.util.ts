import type { IndexConfig } from "../types.js";

const I = "  ";
const II = "    ";
const III = "      ";

export function formatFieldEntry(key: string, value: string): string {
  return `${II}${key}: ${value},`;
}

export function formatIndexCall(schemaVar: string, index: IndexConfig): string {
  const fields = JSON.stringify(index.fields);
  const opts: Record<string, unknown> = {};
  if (index.unique) opts["unique"] = true;
  if (index.sparse) opts["sparse"] = true;
  if (index.background) opts["background"] = true;
  if (index.name) opts["name"] = index.name;
  if (index.expireAfterSeconds !== undefined) opts["expireAfterSeconds"] = index.expireAfterSeconds;
  const optsStr = Object.keys(opts).length > 0 ? `, ${JSON.stringify(opts)}` : "";
  return `${schemaVar}.index(${fields}${optsStr});`;
}

export function wrapSchemaBlock(
  schemaVar: string,
  modelName: string,
  fieldsBlock: string,
  options: string,
): string {
  return `const ${schemaVar} = new Schema({\n${fieldsBlock}\n${I}}${options});`;
}

export function wrapModelExport(modelVar: string, schemaVar: string, collection?: string): string {
  const colArg = collection ? `, "${collection}"` : "";
  return `export const ${modelVar} = model("${modelVar}"${colArg !== "" ? colArg : `, ${schemaVar}`}${colArg !== "" ? `, ${schemaVar}` : ""});`;
}

export function buildSchemaOptions(opts: {
  timestamps?: boolean;
  strict?: boolean;
  versionKey?: boolean;
  collection?: string;
}): string {
  const parts: string[] = [];
  if (opts.timestamps !== false) parts.push(`timestamps: true`);
  if (opts.strict === false) parts.push(`strict: false`);
  if (opts.versionKey === false) parts.push(`versionKey: false`);
  if (opts.collection) parts.push(`collection: "${opts.collection}"`);
  return parts.length > 0 ? `, {\n${I}${parts.join(`,\n${I}`)}\n}` : "";
}

export function buildImportBlock(refs: readonly string[]): string {
  const base = `import { Schema, model, Types } from "mongoose";`;
  if (refs.length === 0) return base;
  return base;
}

export function indentBlock(content: string, spaces: number = 2): string {
  const pad = " ".repeat(spaces);
  return content
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}
