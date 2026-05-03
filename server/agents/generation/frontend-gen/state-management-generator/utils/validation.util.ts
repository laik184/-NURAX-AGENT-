import type { StateConfig, SupportedStateLibrary } from "../types.js";
import { toKebabCase } from "./naming.util.js";

const SUPPORTED_LIBRARIES: readonly SupportedStateLibrary[] = Object.freeze(["redux", "zustand", "context"]);

export function getSupportedLibraries(): readonly SupportedStateLibrary[] {
  return SUPPORTED_LIBRARIES;
}

export function validateStateConfig(config: StateConfig): void {
  if (!config || !config.framework || !config.stateLibrary) {
    throw new Error("State configuration must include framework and stateLibrary.");
  }

  if (!SUPPORTED_LIBRARIES.includes(config.stateLibrary)) {
    throw new Error(`Unsupported state library: ${config.stateLibrary}`);
  }

  const invalidModule = config.modules.find((moduleName) => toKebabCase(moduleName).length === 0);
  if (invalidModule) {
    throw new Error(`Invalid module name: ${invalidModule}`);
  }
}

export function deduplicateModules(modules: readonly string[], logs: string[]): readonly string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const moduleName of modules) {
    const normalized = toKebabCase(moduleName);
    if (seen.has(normalized)) {
      logs.push(`[validation] removed duplicated module '${moduleName}'`);
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return Object.freeze([...unique]);
}
