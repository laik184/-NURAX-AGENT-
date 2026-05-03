import { createHash } from "node:crypto";

export function stableHash(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  const serialized = entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(",");
  return `{${serialized}}`;
}
