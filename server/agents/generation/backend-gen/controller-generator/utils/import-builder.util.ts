import { toCamelCase, toPascalCase } from "./naming.util.js";

export function buildControllerImports(serviceName: string): string {
  const serviceType = `${toPascalCase(serviceName)}Service`;
  const serviceVar = toCamelCase(serviceName) || "service";

  return [
    "import type { Request, Response } from \"express\";",
    `export interface ${serviceType} {`,
    "  [methodName: string]: (payload: unknown) => Promise<unknown>;",
    "}",
    `type ServiceRef = ${serviceType};`,
    `const SERVICE_TOKEN = \"${serviceVar}\";`,
  ].join("\n");
}
