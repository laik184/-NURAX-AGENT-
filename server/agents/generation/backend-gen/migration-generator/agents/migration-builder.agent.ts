import type { ColumnSchema, MigrationStep, SchemaChange, TableSchema } from "../types.js";
import {
  addColumnSql,
  createTableSql,
  dropTableSql,
  modifyColumnSql,
  removeColumnSql,
} from "../utils/sql-template.util.js";

function asTableSchema(value: unknown): TableSchema {
  return value as TableSchema;
}

function asColumnSchema(value: unknown): ColumnSchema {
  return value as ColumnSchema;
}

export function buildMigrationSteps(
  changes: readonly SchemaChange[],
  blockedChanges: readonly SchemaChange[],
): readonly MigrationStep[] {
  const blocked = new Set(blockedChanges.map((change) => `${change.type}:${change.table}:${change.column ?? ""}`));
  const steps: MigrationStep[] = [];

  for (const change of changes) {
    const id = `${change.type}:${change.table}:${change.column ?? ""}`;

    if (blocked.has(id)) {
      continue;
    }

    if (change.type === "add_table") {
      steps.push({
        kind: "CREATE",
        sql: createTableSql(change.table, asTableSchema(change.next).columns),
        reversible: false,
      });
      continue;
    }

    if (change.type === "remove_table") {
      steps.push({
        kind: "DROP",
        sql: dropTableSql(change.table),
        reversible: false,
        warning: "Destructive operation",
      });
      continue;
    }

    if (change.type === "add_column") {
      steps.push({
        kind: "ALTER",
        sql: addColumnSql(change.table, change.column ?? "", asColumnSchema(change.next)),
        reversible: true,
      });
      continue;
    }

    if (change.type === "remove_column") {
      steps.push({
        kind: "ALTER",
        sql: removeColumnSql(change.table, change.column ?? ""),
        reversible: false,
        warning: "Destructive operation",
      });
      continue;
    }

    if (change.type === "modify_column") {
      steps.push({
        kind: "ALTER",
        sql: modifyColumnSql(change.table, change.column ?? "", asColumnSchema(change.next)),
        reversible: false,
      });
    }
  }

  return Object.freeze(steps);
}
