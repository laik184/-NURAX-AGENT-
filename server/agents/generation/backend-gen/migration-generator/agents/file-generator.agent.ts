import { join } from "node:path";
import type { MigrationFile, MigrationStep, TemplateSelection } from "../types.js";
import { writeTextFile } from "../utils/file-writer.util.js";
import { wrapSqlTransaction } from "../utils/sql-template.util.js";

function renderOrmTemplate(template: TemplateSelection, steps: readonly MigrationStep[]): string {
  const statements = steps.map((step) => `    await db.execute(${JSON.stringify(step.sql)});`).join("\n");

  return [
    template.headerComment,
    "export async function up(db: { execute: (sql: string) => Promise<unknown> }): Promise<void> {",
    statements || "    // No-op migration",
    "}",
    "",
  ].join("\n");
}

function renderSqlTemplate(template: TemplateSelection, steps: readonly MigrationStep[]): string {
  const statements = steps.map((step) => step.sql);
  return `${template.headerComment}\n${wrapSqlTransaction(statements)}`;
}

export async function generateMigrationFile(params: {
  readonly outputDir: string;
  readonly migrationName: string;
  readonly template: TemplateSelection;
  readonly steps: readonly MigrationStep[];
  readonly dryRun: boolean;
}): Promise<MigrationFile> {
  const { outputDir, migrationName, template, steps, dryRun } = params;
  const filePath = join(outputDir, migrationName);
  const content = template.template === "orm"
    ? renderOrmTemplate(template, steps)
    : renderSqlTemplate(template, steps);

  if (!dryRun) {
    await writeTextFile(filePath, content);
  }

  return Object.freeze({
    filePath,
    migrationName,
    content,
    template: template.template,
    createdAt: new Date().toISOString(),
  });
}
