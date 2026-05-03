import { generateActionFiles } from "./agents/action-generator.agent.js";
import { generateMiddlewareFile } from "./agents/middleware-generator.agent.js";
import { generateProviderFile } from "./agents/provider-generator.agent.js";
import { generateSelectorFiles } from "./agents/selector-generator.agent.js";
import { generateSliceFiles, generateSliceRegistry } from "./agents/slice-generator.agent.js";
import { generateStoreFile } from "./agents/store-generator.agent.js";
import { getOrchestratorActorToken, mutateStateGeneratorState, resetStateGeneratorState } from "./state.js";
import type { GenerationFile, GenerationResult, StateConfig, SupportedFramework, SupportedStateLibrary } from "./types.js";
import { writeGeneratedFiles } from "./utils/file-writer.util.js";
import { deduplicateModules, validateStateConfig } from "./utils/validation.util.js";

export interface StateGenerationInput {
  readonly framework?: SupportedFramework;
  readonly stateLibrary?: SupportedStateLibrary;
  readonly modules: readonly string[];
}

export function generateStateManagement(input: StateGenerationInput): GenerationResult {
  const actor = getOrchestratorActorToken();
  resetStateGeneratorState(actor);

  const logs: string[] = [];

  try {
    const framework = detectFramework(input.framework);
    const stateLibrary = detectStateLibrary(input.stateLibrary);
    const modules = deduplicateModules(input.modules, logs);

    const config: StateConfig = Object.freeze({
      framework,
      stateLibrary,
      modules,
    });

    validateStateConfig(config);

    mutateStateGeneratorState(actor, {
      framework,
      stateLibrary,
      modules,
      status: "RUNNING",
      logs: Object.freeze([...logs]),
      errors: Object.freeze([]),
    });

    const store = generateStoreFile(config);
    logs.push("[orchestrator] store generated");

    const slices = generateSliceFiles(config);
    logs.push("[orchestrator] slices generated");

    const actions = generateActionFiles(config);
    logs.push("[orchestrator] actions generated");

    const selectors = generateSelectorFiles(config);
    logs.push("[orchestrator] selectors generated");

    const middleware = generateMiddlewareFile(config);
    logs.push("[orchestrator] middleware generated");

    const provider = generateProviderFile(config);
    logs.push("[orchestrator] provider generated");

    const files: GenerationFile[] = [
      store,
      ...slices.map((slice) => ({ path: slice.filePath, content: slice.code })),
      generateSliceRegistry(config, slices),
      ...actions.map((action) => ({ path: action.filePath, content: action.code })),
      ...selectors.map((selector) => ({ path: selector.filePath, content: selector.code })),
      middleware,
      provider,
    ];

    const writtenPaths = writeGeneratedFiles(files);
    logs.push("[orchestrator] files written");

    mutateStateGeneratorState(actor, {
      filesGenerated: writtenPaths,
      status: "SUCCESS",
      logs: Object.freeze([...logs]),
      errors: Object.freeze([]),
    });

    const output: GenerationResult = {
      success: true,
      files: writtenPaths,
      stateLibrary,
      logs: Object.freeze([...logs]),
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown state generation error";
    logs.push(`[orchestrator] failed: ${message}`);

    mutateStateGeneratorState(actor, {
      status: "FAILED",
      logs: Object.freeze([...logs]),
      errors: Object.freeze([message]),
    });

    const output: GenerationResult = {
      success: false,
      files: Object.freeze([]),
      stateLibrary: detectStateLibrary(input.stateLibrary),
      logs: Object.freeze([...logs]),
      error: message,
    };

    return Object.freeze(output);
  }
}

function detectFramework(explicit?: SupportedFramework): SupportedFramework {
  return explicit ?? "react";
}

function detectStateLibrary(explicit?: SupportedStateLibrary): SupportedStateLibrary {
  return explicit ?? "redux";
}
