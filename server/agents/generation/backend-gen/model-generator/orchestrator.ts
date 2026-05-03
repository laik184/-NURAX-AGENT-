import { parseSchema } from "./agents/schema-parser.agent.js";
import { mapRelations } from "./agents/relation-mapper.agent.js";
import { buildConstraints } from "./agents/constraint-builder.agent.js";
import { buildIndexes } from "./agents/index-builder.agent.js";
import { buildModelArtifact } from "./agents/model-builder.agent.js";
import { adaptToOrm } from "./agents/orm-adapter.agent.js";
import {
  appendError,
  appendLog,
  getState,
  resetState,
  setConstraints,
  setGeneratedCode,
  setIndexes,
  setParsedSchema,
  setRelations,
  setStatus,
} from "./state.js";
import type { ModelOutput, ModelSchema, SupportedOrm } from "./types.js";

export function generateModel(input: string | ModelSchema, orm: SupportedOrm): ModelOutput {
  resetState();
  setStatus("RUNNING");

  try {
    appendLog("Received schema input.");
    const parsedSchema = parseSchema(input);
    setParsedSchema(parsedSchema);
    appendLog("Schema parser completed.");

    const relations = mapRelations(parsedSchema);
    setRelations(relations);
    appendLog("Relation mapper completed.");

    const constraints = buildConstraints(parsedSchema);
    setConstraints(constraints);
    appendLog("Constraint builder completed.");

    const indexes = buildIndexes(parsedSchema);
    setIndexes(indexes);
    appendLog("Index builder completed.");

    const artifact = buildModelArtifact(parsedSchema, relations, constraints, indexes);
    appendLog("Model builder completed.");

    const generatedCode = adaptToOrm(artifact, orm);
    setGeneratedCode(generatedCode);
    appendLog(`ORM adapter completed for ${orm}.`);

    setStatus("SUCCESS");

    const snapshot = getState();
    const output: ModelOutput = {
      success: true,
      modelName: snapshot.modelName,
      code: snapshot.generatedCode,
      orm,
      logs: [...snapshot.logs],
    };

    return Object.freeze(output);
  } catch (error) {
    setStatus("FAILED");
    const message = error instanceof Error ? error.message : "Unknown model generation error.";
    appendError(message);
    appendLog("Model generation failed.");

    const snapshot = getState();
    const output: ModelOutput = {
      success: false,
      modelName: snapshot.modelName,
      code: snapshot.generatedCode,
      orm,
      logs: [...snapshot.logs],
      error: message,
    };

    return Object.freeze(output);
  }
}
