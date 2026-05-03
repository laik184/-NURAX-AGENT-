import { buildCode } from "../utils/code-builder.util.js";
import { buildImports } from "../utils/import-builder.util.js";
import { buildMiddlewareName } from "../utils/naming.util.js";
import { loadTemplate } from "../utils/template-loader.util.js";
import type { MiddlewareConfig, MiddlewareResult } from "../types.js";

export function generateAuthMiddleware(config: MiddlewareConfig): MiddlewareResult {
  const logs = [
    `Auth middleware generation started for framework=${config.framework}`,
    "Template loaded successfully",
    "Auth middleware generation completed",
  ];

  const output: MiddlewareResult = {
    success: true,
    name: buildMiddlewareName(config),
    code: buildCode(buildImports(config.framework, "auth"), loadTemplate(config.framework, "auth")),
    framework: config.framework,
    logs,
  };

  return Object.freeze(output);
}
