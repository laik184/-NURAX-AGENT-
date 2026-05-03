import type { ControllerConfig } from "../types.js";

export interface ControllerTemplate {
  readonly header: string;
  readonly footer: string;
}

export function loadControllerTemplate(config: ControllerConfig): ControllerTemplate {
  const header = `// Generated ${config.frameworkTarget ?? "agnostic"} controller`;
  const footer = "// End generated controller";
  return Object.freeze({ header, footer });
}
