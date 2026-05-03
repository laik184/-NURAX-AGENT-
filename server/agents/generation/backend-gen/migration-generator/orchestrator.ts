import { buildMigrationSteps } from "./agents/migration-builder.agent.js";
import { generateMigrationFile } from "./agents/file-generator.agent.js";
import { generateMigrationName } from "./agents/naming-strategy.agent.js";
import { detectSchemaChanges } from "./agents/schema-diff.agent.js";
import { runSafetyChecks } from "./agents/safety-check.agent.js";
import { selectTemplate } from "./agents/template-selector.agent.js";
import {
  addGeneratedFile,
  appendLog,
  beginGeneration,
  createInitialState,
  markFailed,
  markSuccess,
  setDetectedChanges,
} from "./state.js";
import type { GenerateMigrationInput, GenerationResult } from "./types.js";
import { logMessage } from "./utils/logger.util.js";

export async function generateMigration(input: GenerateMigrationInput): Promise<GenerationResult> {
  let state = createInitialState();

  try {
    state = beginGeneration(state, input.currentSchema, input.targetSchema);
    state = appendLog(state, logMessage("orchestrator", "Migration generation started."));

    const changes = detectSchemaChanges(input.currentSchema, input.targetSchema);
    state = setDetectedChanges(state, changes);
    state = appendLog(state, logMessage("schema-diff.agent", `Detected ${changes.length} schema change(s).`));

    const safety = runSafetyChecks(changes, Boolean(input.allowDestructive));
    for (const warning of safety.warnings) {
      state = appendLog(state, logMessage("safety-check.agent", warning, "WARN"));
    }

    if (!safety.safe) {
      const error = "Blocked destructive schema changes. Set allowDestructive=true to override.";
      state = markFailed(state, error);
      const output: GenerationResult = {
        success: false,
        filePath: "",
        migrationName: "",
        changes,
        logs: state.logs,
        error,
      };
      return Object.freeze(output);
    }

    const steps = buildMigrationSteps(changes, safety.blockedChanges);
    state = appendLog(state, logMessage("migration-builder.agent", `Built ${steps.length} migration step(s).`));

    const template = selectTemplate(input.templatePreference);
    state = appendLog(state, logMessage("template-selector.agent", `Selected template: ${template.template}.`));

    const migrationName = generateMigrationName(
      input.migrationLabel ?? "schema_update",
      template.extension,
    );
    state = appendLog(state, logMessage("naming-strategy.agent", `Generated migration file name: ${migrationName}.`));

    const generatedFile = await generateMigrationFile({
      outputDir: input.outputDir,
      migrationName,
      template,
      steps,
      dryRun: Boolean(input.dryRun),
    });

    state = addGeneratedFile(state, generatedFile);
    state = markSuccess(state);
    state = appendLog(state, logMessage("file-generator.agent", `Migration file prepared: ${generatedFile.filePath}.`));

    const output: GenerationResult = {
      success: true,
      filePath: generatedFile.filePath,
      migrationName: generatedFile.migrationName,
      changes,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown migration generation error.";
    state = markFailed(state, errorMessage);

    const output: GenerationResult = {
      success: false,
      filePath: "",
      migrationName: "",
      changes: state.changes,
      logs: state.logs,
      error: errorMessage,
    };

    return Object.freeze(output);
  }
}

export async function previewMigration(input: GenerateMigrationInput): Promise<GenerationResult> {
  return generateMigration({
    ...input,
    dryRun: true,
  });
}
