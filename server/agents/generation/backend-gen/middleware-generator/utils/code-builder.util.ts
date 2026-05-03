import { formatCode } from "./formatter.util.js";

export function buildCode(imports: readonly string[], template: string): string {
  const joinedImports = imports.join("\n");
  return formatCode(`${joinedImports}\n\n${template}`);
}
