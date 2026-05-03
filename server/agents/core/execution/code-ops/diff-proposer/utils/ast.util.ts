import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { File } from "@babel/types";

export function canParseWithBabel(path: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path);
}

export function parseCode(path: string, source: string): File {
  return parse(source, {
    sourceFilename: path,
    sourceType: "module",
    errorRecovery: false,
    plugins: ["typescript", "jsx"],
  });
}

export function collectTopLevelSymbols(ast: File): string[] {
  const symbols = new Set<string>();
  traverse(ast, {
    FunctionDeclaration(nodePath) {
      if (nodePath.node.id?.name) {
        symbols.add(nodePath.node.id.name);
      }
    },
    ClassDeclaration(nodePath) {
      if (nodePath.node.id?.name) {
        symbols.add(nodePath.node.id.name);
      }
    },
    VariableDeclarator(nodePath) {
      if (nodePath.parentPath.parentPath?.isProgram() && nodePath.node.id.type === "Identifier") {
        symbols.add(nodePath.node.id.name);
      }
    },
  });
  return [...symbols].sort();
}
