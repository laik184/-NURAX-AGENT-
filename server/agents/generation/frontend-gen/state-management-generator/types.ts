export type SupportedFramework = "react" | "next";

export type SupportedStateLibrary = "redux" | "zustand" | "context";

export interface StateConfig {
  readonly framework: SupportedFramework;
  readonly stateLibrary: SupportedStateLibrary;
  readonly modules: readonly string[];
}

export interface StoreConfig {
  readonly filePath: string;
  readonly code: string;
}

export interface SliceConfig {
  readonly moduleName: string;
  readonly filePath: string;
  readonly code: string;
}

export interface ActionConfig {
  readonly moduleName: string;
  readonly filePath: string;
  readonly code: string;
}

export interface SelectorConfig {
  readonly moduleName: string;
  readonly filePath: string;
  readonly code: string;
}

export interface MiddlewareConfig {
  readonly filePath: string;
  readonly code: string;
}

export interface ProviderConfig {
  readonly filePath: string;
  readonly code: string;
}

export interface GenerationFile {
  readonly path: string;
  readonly content: string;
}

export interface GenerationResult {
  readonly success: boolean;
  readonly files: readonly string[];
  readonly stateLibrary: SupportedStateLibrary;
  readonly logs: readonly string[];
  readonly error?: string;
}
