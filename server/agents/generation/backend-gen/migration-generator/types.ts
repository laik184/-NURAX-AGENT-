export type TemplateKind = "sql" | "orm";

export interface ColumnSchema {
  readonly type: string;
  readonly nullable?: boolean;
  readonly default?: string | number | boolean | null;
}

export interface TableSchema {
  readonly columns: Readonly<Record<string, ColumnSchema>>;
}

export interface Schema {
  readonly tables: Readonly<Record<string, TableSchema>>;
}

export type SchemaChangeType =
  | "add_table"
  | "remove_table"
  | "add_column"
  | "remove_column"
  | "modify_column";

export interface SchemaChange {
  readonly type: SchemaChangeType;
  readonly table: string;
  readonly column?: string;
  readonly previous?: ColumnSchema | TableSchema;
  readonly next?: ColumnSchema | TableSchema;
}

export interface MigrationStep {
  readonly kind: "CREATE" | "ALTER" | "DROP";
  readonly sql: string;
  readonly reversible: boolean;
  readonly warning?: string;
}

export interface MigrationFile {
  readonly filePath: string;
  readonly migrationName: string;
  readonly content: string;
  readonly template: TemplateKind;
  readonly createdAt: string;
}

export interface GenerationResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly migrationName: string;
  readonly changes: readonly SchemaChange[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface GenerateMigrationInput {
  readonly currentSchema: Schema;
  readonly targetSchema: Schema;
  readonly outputDir: string;
  readonly migrationLabel?: string;
  readonly templatePreference?: TemplateKind;
  readonly allowDestructive?: boolean;
  readonly dryRun?: boolean;
}

export interface SafetyCheckResult {
  readonly safe: boolean;
  readonly blockedChanges: readonly SchemaChange[];
  readonly warnings: readonly string[];
}

export interface TemplateSelection {
  readonly template: TemplateKind;
  readonly extension: "sql" | "ts";
  readonly headerComment: string;
}
