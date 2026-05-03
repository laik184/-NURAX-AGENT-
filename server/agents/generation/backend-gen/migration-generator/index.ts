export { generateMigration, previewMigration } from "./orchestrator.js";

export type {
  ColumnSchema,
  GenerateMigrationInput,
  GenerationResult,
  MigrationFile,
  MigrationStep,
  Schema,
  SchemaChange,
  SafetyCheckResult,
  TableSchema,
  TemplateKind,
  TemplateSelection,
} from "./types.js";

export type { GenerationStatus, MigrationGeneratorState } from "./state.js";
export { createInitialState } from "./state.js";
