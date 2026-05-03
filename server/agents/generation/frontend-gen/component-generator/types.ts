export type SupportedFramework = "react" | "vue";
export type ComponentKind = "presentational" | "container";
export type ComponentVariant = "card" | "form" | "modal";
export type StyleStrategy = "tailwind" | "css";
export type TestStrategy = "vitest" | "jest";

export interface ComponentPropInput {
  readonly name: string;
  readonly type: string;
  readonly required?: boolean;
  readonly description?: string;
  readonly defaultValue?: string;
}

export interface ComponentRequest {
  readonly componentName: string;
  readonly kind?: ComponentKind;
  readonly framework?: SupportedFramework;
  readonly variant?: ComponentVariant;
  readonly styleStrategy?: StyleStrategy;
  readonly testStrategy?: TestStrategy;
  readonly props?: readonly ComponentPropInput[];
  readonly outputRoot?: string;
}

export interface ComponentPlan {
  readonly componentName: string;
  readonly normalizedName: string;
  readonly framework: SupportedFramework;
  readonly kind: ComponentKind;
  readonly variant: ComponentVariant;
  readonly styleStrategy: StyleStrategy;
  readonly testStrategy: TestStrategy;
  readonly directory: string;
  readonly componentFileName: string;
  readonly styleFileName: string;
  readonly testFileName: string;
  readonly exportFileName: string;
}

export interface PropsDefinition {
  readonly interfaceName: string;
  readonly framework: SupportedFramework;
  readonly props: readonly {
    readonly name: string;
    readonly type: string;
    readonly required: boolean;
    readonly description: string | null;
    readonly defaultValue: string | null;
  }[];
  readonly signature: string;
}

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
  readonly language: string;
}

export interface FileWriterAgent {
  writeFiles(files: readonly GeneratedFile[]): Promise<void>;
}

export interface ComponentGeneratorState {
  readonly componentName: string;
  readonly props: PropsDefinition["props"];
  readonly template: string;
  readonly files: readonly GeneratedFile[];
  readonly status: "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface ComponentResult {
  readonly success: boolean;
  readonly componentName: string;
  readonly files: readonly GeneratedFile[];
  readonly logs: readonly string[];
  readonly error?: string;
}
