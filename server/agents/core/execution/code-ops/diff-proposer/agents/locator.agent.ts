import type { AstEnvelope, FileEnvelope, IntentOperation, LocatedEdit, ParsedIntent, TextRange } from "../types.js";
import { toLineRange } from "../utils/range.util.js";

export function locateEdits(
  files: ReadonlyArray<FileEnvelope>,
  asts: ReadonlyArray<AstEnvelope>,
  intent: ParsedIntent,
): ReadonlyArray<LocatedEdit> {
  const astByPath = new Map(asts.map((ast) => [ast.path, ast]));
  const edits: LocatedEdit[] = [];

  for (const file of files) {
    const ast = astByPath.get(file.path);
    for (const op of intent.operations) {
      const located = locateOperation(file, ast, op, intent.targetSymbol);
      if (located) {
        edits.push({ ...located, path: file.path });
      }
    }
  }

  return edits.sort((a, b) => a.path.localeCompare(b.path) || a.range.start - b.range.start);
}

function locateOperation(
  file: FileEnvelope,
  ast: AstEnvelope | undefined,
  operation: IntentOperation,
  symbol?: string,
): Omit<LocatedEdit, "path"> | null {
  if (operation.kind === "append") {
    const line = Math.max(file.lines.length, 1);
    return { type: "add", range: { start: line, end: line }, content: operation.content ?? "", symbol };
  }
  if (operation.kind === "prepend") {
    return { type: "add", range: { start: 1, end: 1 }, content: operation.content ?? "", symbol };
  }
  if (operation.kind === "range_replace" && operation.range) {
    return { type: "update", range: operation.range, content: operation.content ?? "", symbol };
  }

  const token = operation.match;
  if (!token) {
    return null;
  }

  const index = file.content.indexOf(token);
  if (index < 0) {
    return null;
  }

  const range = toLineRange(file.content, index, index + token.length);
  if (operation.kind === "delete") {
    return { type: "delete", range, content: "", symbol: symbolFromAst(ast, symbol) };
  }
  if (operation.kind === "replace") {
    return { type: "update", range, content: operation.content ?? "", symbol: symbolFromAst(ast, symbol) };
  }

  const insertionRange: TextRange = { start: range.end, end: range.end };
  if (operation.kind === "insert_before") {
    insertionRange.start = range.start;
    insertionRange.end = range.start;
  }

  return {
    type: "add",
    range: insertionRange,
    content: operation.content ?? "",
    symbol: symbolFromAst(ast, symbol),
  };
}

function symbolFromAst(ast: AstEnvelope | undefined, preferred?: string): string | undefined {
  if (preferred) {
    return preferred;
  }
  return ast?.symbols[0];
}
