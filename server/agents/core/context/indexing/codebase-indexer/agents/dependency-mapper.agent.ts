import ts from 'typescript';
import type { DependencyGraph, FileDependency, ParsedFile } from '../types.js';

export function mapDependencies(parsedFiles: readonly ParsedFile[]): DependencyGraph {
  const graph: Record<string, FileDependency> = {};

  for (const parsed of parsedFiles) {
    const imports = new Set<string>();
    const exports = new Set<string>();

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.add(node.moduleSpecifier.text);
      }

      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          exports.add(node.moduleSpecifier.text);
        } else if (node.exportClause) {
          exports.add(node.exportClause.getText(parsed.ast));
        }
      }

      if (
        (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const nodeName = (node as ts.FunctionDeclaration | ts.ClassDeclaration | ts.InterfaceDeclaration).name;
        if (nodeName) {
          exports.add(nodeName.getText(parsed.ast));
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(parsed.ast);

    graph[parsed.file.path] = {
      imports: Object.freeze(Array.from(imports).sort()),
      exports: Object.freeze(Array.from(exports).sort()),
    };
  }

  return Object.freeze(graph);
}
