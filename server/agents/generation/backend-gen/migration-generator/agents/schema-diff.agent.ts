import type { Schema, SchemaChange } from "../types.js";

function isSameObject(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function detectSchemaChanges(currentSchema: Schema, targetSchema: Schema): readonly SchemaChange[] {
  const changes: SchemaChange[] = [];
  const currentTables = currentSchema.tables;
  const targetTables = targetSchema.tables;

  for (const [tableName, targetTable] of Object.entries(targetTables)) {
    const currentTable = currentTables[tableName];

    if (!currentTable) {
      changes.push({ type: "add_table", table: tableName, next: targetTable });
      continue;
    }

    for (const [columnName, targetColumn] of Object.entries(targetTable.columns)) {
      const currentColumn = currentTable.columns[columnName];

      if (!currentColumn) {
        changes.push({
          type: "add_column",
          table: tableName,
          column: columnName,
          next: targetColumn,
        });
        continue;
      }

      if (!isSameObject(currentColumn, targetColumn)) {
        changes.push({
          type: "modify_column",
          table: tableName,
          column: columnName,
          previous: currentColumn,
          next: targetColumn,
        });
      }
    }

    for (const [columnName, currentColumn] of Object.entries(currentTable.columns)) {
      if (!targetTable.columns[columnName]) {
        changes.push({
          type: "remove_column",
          table: tableName,
          column: columnName,
          previous: currentColumn,
        });
      }
    }
  }

  for (const [tableName, currentTable] of Object.entries(currentTables)) {
    if (!targetTables[tableName]) {
      changes.push({ type: "remove_table", table: tableName, previous: currentTable });
    }
  }

  return Object.freeze(changes);
}
