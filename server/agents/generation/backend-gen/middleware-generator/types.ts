export type FrameworkType = "express" | "nest";

export type MiddlewareType =
  | "auth"
  | "logging"
  | "validation"
  | "error"
  | "rate-limit";

export interface MiddlewareConfig {
  readonly name?: string;
  readonly framework: FrameworkType;
  readonly type: MiddlewareType;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface MiddlewareResult {
  readonly success: boolean;
  readonly name: string;
  readonly code: string;
  readonly framework: FrameworkType;
  readonly logs: readonly string[];
  readonly error?: string;
}
