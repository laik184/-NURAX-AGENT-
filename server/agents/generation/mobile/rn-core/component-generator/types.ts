export type ComponentType =
  | "view"
  | "text"
  | "button"
  | "list"
  | "input"
  | "image"
  | "modal"
  | "icon";

export type ComponentRequest = {
  readonly type: ComponentType;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly children?: unknown;
};

export type ComponentOutput = {
  readonly success: boolean;
  readonly code: string;
  readonly logs: readonly string[];
  readonly error?: string;
};
