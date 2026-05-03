import type { ColumnSchema } from "../types.js";
import { formatDefaultValue } from "./string-format.util.js";

function formatColumn(name: string, column: ColumnSchema): string {
  const nullability = column.nullable ? "" : " NOT NULL";
  const defaultValue = formatDefaultValue(column.default);
  return `${name} ${column.type}${nullability}${defaultValue}`;
}

export function createTableSql(table: string, columns: Readonly<Record<string, ColumnSchema>>): string {
  const columnDefs = Object.entries(columns)
    .map(([name, schema]) => `  ${formatColumn(name, schema)}`)
    .join(",\n");

  return `CREATE TABLE ${table} (\n${columnDefs}\n);`;
}

export function dropTableSql(table: string): string {
  return `DROP TABLE ${table};`;
}

export function addColumnSql(table: string, column: string, schema: ColumnSchema): string {
  return `ALTER TABLE ${table} ADD COLUMN ${formatColumn(column, schema)};`;
}

export function removeColumnSql(table: string, column: string): string {
  return `ALTER TABLE ${table} DROP COLUMN ${column};`;
}

export function modifyColumnSql(table: string, column: string, schema: ColumnSchema): string {
  const nullability = schema.nullable ? "DROP NOT NULL" : "SET NOT NULL";
  return [
    `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${schema.type};`,
    `ALTER TABLE ${table} ALTER COLUMN ${column} ${nullability};`,
  ].join("\n");
}

export function wrapSqlTransaction(statements: readonly string[]): string {
  const body = statements.join("\n\n");
  return `BEGIN;\n\n${body}\n\nCOMMIT;\n`;
}
