import { toSnakeCase } from "../utils/string-format.util.js";
import { toMigrationTimestamp } from "../utils/timestamp.util.js";

export function generateMigrationName(
  label: string,
  extension: "sql" | "ts",
  date: Date = new Date(),
): string {
  const prefix = toMigrationTimestamp(date);
  const safeLabel = toSnakeCase(label || "schema_update");
  return `${prefix}_${safeLabel}.${extension}`;
}
