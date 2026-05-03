import { buildCode } from "../utils/code-builder.util.js";
import { buildImports } from "../utils/import-builder.util.js";
import { buildMiddlewareName } from "../utils/naming.util.js";
import { loadTemplate } from "../utils/template-loader.util.js";
import type { MiddlewareConfig, MiddlewareResult } from "../types.js";

export function generateRateLimitMiddleware(config: MiddlewareConfig): MiddlewareResult {
  const logs = [
    `Rate-limit middleware generation started for framework=${config.framework}`,
    "Template loaded successfully",
    "Rate-limit middleware generation completed",
  ];

  const output: MiddlewareResult = {
    success: true,
    name: buildMiddlewareName(config),
    code: buildCode(
      buildImports(config.framework, "rate-limit"),
      loadTemplate(config.framework, "rate-limit"),
    ),
    framework: config.framework,
    logs,
  };

  return Object.freeze(output);
}
