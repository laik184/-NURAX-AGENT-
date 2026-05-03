import { buildCode } from "../utils/code-builder.util.js";
import { buildImports } from "../utils/import-builder.util.js";
import { buildMiddlewareName } from "../utils/naming.util.js";
import { loadTemplate } from "../utils/template-loader.util.js";
import type { MiddlewareConfig, MiddlewareResult } from "../types.js";

export function generateErrorMiddleware(config: MiddlewareConfig): MiddlewareResult {
  const logs = [
    `Error middleware generation started for framework=${config.framework}`,
    "Template loaded successfully",
    "Error middleware generation completed",
  ];

  const output: MiddlewareResult = {
    success: true,
    name: buildMiddlewareName(config),
    code: buildCode(buildImports(config.framework, "error"), loadTemplate(config.framework, "error")),
    framework: config.framework,
    logs,
  };

  return Object.freeze(output);
}
