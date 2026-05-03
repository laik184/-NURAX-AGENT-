import type { ComponentPlan, ComponentRequest } from "../types.js";
import { toKebabCase, toPascalCase } from "../utils/naming.util.js";

export function planComponent(request: Readonly<ComponentRequest>): ComponentPlan {
  const normalizedName = toPascalCase(request.componentName || "GeneratedComponent");
  const framework = request.framework ?? "react";
  const directory = request.outputRoot ?? "src/components";

  return Object.freeze({
    componentName: request.componentName,
    normalizedName,
    framework,
    kind: request.kind ?? "presentational",
    variant: request.variant ?? "card",
    styleStrategy: request.styleStrategy ?? "tailwind",
    testStrategy: request.testStrategy ?? "vitest",
    directory,
    componentFileName: framework === "vue" ? `${toKebabCase(normalizedName)}.vue` : `${normalizedName}.tsx`,
    styleFileName: request.styleStrategy === "css" ? `${toKebabCase(normalizedName)}.css` : "",
    testFileName: `${normalizedName}.test.tsx`,
    exportFileName: "index.ts",
  });
}
