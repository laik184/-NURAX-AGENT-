import type { ModelSchema, ParsedSchema } from "../types.js";
import { normalizeSchema } from "../utils/schema-normalizer.util.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseYamlLikeInput(raw: string): Record<string, unknown> {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const output: Record<string, unknown> = {};
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (value === "[]") {
      output[key] = [];
      continue;
    }
    output[key] = value.replace(/^['\"]|['\"]$/g, "");
  }
  return output;
}

function parseRawSchema(input: string | ModelSchema): ModelSchema {
  if (typeof input !== "string") {
    return input;
  }

  const trimmed = input.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as ModelSchema;
  }

  return parseYamlLikeInput(trimmed) as unknown as ModelSchema;
}

export function validateSchema(input: string | ModelSchema): boolean {
  try {
    const parsed = parseRawSchema(input);
    return (
      typeof parsed.name === "string" &&
      Array.isArray(parsed.fields) &&
      parsed.fields.every((field) => isObject(field) && typeof field["name"] === "string" && typeof field["type"] === "string")
    );
  } catch {
    return false;
  }
}

export function parseSchema(input: string | ModelSchema): ParsedSchema {
  const raw = parseRawSchema(input);

  if (!validateSchema(raw)) {
    throw new Error("Invalid model schema input.");
  }

  return normalizeSchema({
    name: raw.name,
    fields: raw.fields,
    relations: raw.relations ?? [],
    indexes: raw.indexes ?? [],
  });
}
