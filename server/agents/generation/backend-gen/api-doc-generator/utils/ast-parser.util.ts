import ts from "typescript";

export interface ParsedSource {
  readonly filePath: string;
  readonly sourceText: string;
  readonly sourceFile: ts.SourceFile;
}

export function parseSource(filePath: string, sourceText: string): ParsedSource {
  return {
    filePath,
    sourceText,
    sourceFile: ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true),
  };
}
