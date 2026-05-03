import ts from 'typescript';
import type { ParsedFile, SymbolMeta, SymbolKind } from '../types.js';

export function extractSymbols(parsedFiles: readonly ParsedFile[]): readonly SymbolMeta[] {
  const symbols: SymbolMeta[] = [];

  for (const parsed of parsedFiles) {
    const visit = (node: ts.Node): void => {
      const symbol = extractNodeSymbol(node, parsed.ast);
      if (symbol) {
        symbols.push({
          ...symbol,
          filePath: parsed.file.path,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(parsed.ast);
  }

  return Object.freeze(symbols);
}

function extractNodeSymbol(node: ts.Node, sourceFile: ts.SourceFile): Omit<SymbolMeta, 'filePath'> | null {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return createSymbolMeta(node.name.text, 'function', node, sourceFile, hasExportModifier(node), buildSignature(node));
  }

  if (ts.isClassDeclaration(node) && node.name) {
    return createSymbolMeta(node.name.text, 'class', node, sourceFile, hasExportModifier(node));
  }

  if (ts.isInterfaceDeclaration(node)) {
    return createSymbolMeta(node.name.text, 'interface', node, sourceFile, hasExportModifier(node));
  }

  if (ts.isTypeAliasDeclaration(node)) {
    return createSymbolMeta(node.name.text, 'type', node, sourceFile, hasExportModifier(node));
  }

  if (ts.isEnumDeclaration(node)) {
    return createSymbolMeta(node.name.text, 'enum', node, sourceFile, hasExportModifier(node));
  }

  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return createSymbolMeta(node.name.text, 'method', node, sourceFile, hasExportModifier(node), buildSignature(node));
  }

  return null;
}

function createSymbolMeta(
  name: string,
  kind: SymbolKind,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  exported: boolean,
  signature?: string,
): Omit<SymbolMeta, 'filePath'> {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  return {
    name,
    kind,
    line,
    exported,
    ...(signature ? { signature } : {}),
  };
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return Boolean(modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function buildSignature(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
  const parameters = node.parameters
    .map((parameter) => {
      const paramName = parameter.name.getText();
      const paramType = parameter.type?.getText() ?? 'unknown';
      return `${paramName}: ${paramType}`;
    })
    .join(', ');

  const returnType = node.type?.getText() ?? 'unknown';
  return `(${parameters}) => ${returnType}`;
}
