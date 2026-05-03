import type { AstEnvelope, FileEnvelope } from "../types.js";
import { canParseWithBabel, collectTopLevelSymbols, parseCode } from "../utils/ast.util.js";

export function parseAsts(files: ReadonlyArray<FileEnvelope>): ReadonlyArray<AstEnvelope> {
  return files.map((file) => {
    if (!canParseWithBabel(file.path)) {
      return {
        path: file.path,
        syntaxSupported: false,
        syntaxValid: true,
        symbols: [],
      };
    }

    try {
      const ast = parseCode(file.path, file.content);
      return {
        path: file.path,
        syntaxSupported: true,
        syntaxValid: true,
        symbols: collectTopLevelSymbols(ast),
      };
    } catch {
      return {
        path: file.path,
        syntaxSupported: true,
        syntaxValid: false,
        symbols: [],
      };
    }
  });
}
