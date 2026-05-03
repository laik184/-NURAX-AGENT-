import type { ControllerConfig, MethodDefinition } from "../types.js";
import { normalizeCode } from "../utils/code-formatter.util.js";
import { buildControllerImports } from "../utils/import-builder.util.js";
import { toPascalCase } from "../utils/naming.util.js";
import { loadControllerTemplate } from "../utils/template-loader.util.js";

export interface BuiltControllerSource {
  readonly code: string;
}

export function buildControllerSource(
  config: ControllerConfig,
  methods: readonly MethodDefinition[],
  methodBodies: Readonly<Record<string, string>>,
  validationCode: string,
): BuiltControllerSource {
  const className = `${toPascalCase(config.controllerName)}Controller`;
  const template = loadControllerTemplate(config);
  const imports = buildControllerImports(config.serviceName);

  const methodBlocks = methods.map((method) => {
    const body = methodBodies[method.name] ?? "return res.status(500).json({ success: false, error: 'Missing method body' });";
    return [
      `public async ${method.name}(req: Request, res: Response): Promise<Response> {`,
      body
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
      "}",
    ].join("\n");
  });

  const code = [
    template.header,
    imports,
    validationCode,
    `export class ${className} {`,
    "  public constructor(private readonly service: ServiceRef) {}",
    "",
    methodBlocks
      .join("\n\n")
      .split("\n")
      .map((line) => (line.length > 0 ? `  ${line}` : line))
      .join("\n"),
    "}",
    "",
    `export const create${className} = (service: ServiceRef): ${className} => new ${className}(service);`,
    template.footer,
  ].join("\n");

  return Object.freeze({ code: normalizeCode(code) });
}
