import type { AstEnvelope, DiffPatch, FileEnvelope } from "../types.js";
import { canParseWithBabel, parseCode } from "../utils/ast.util.js";

export interface SafetyReport {
  warnings: string[];
  confidenceDelta: number;
}

export function checkSafety(
  files: ReadonlyArray<FileEnvelope>,
  asts: ReadonlyArray<AstEnvelope>,
  plans: Map<string, DiffPatch[]>,
  afterContents: ReadonlyMap<string, string>,
  maxEditSpanLines = 80,
): SafetyReport {
  const warnings: string[] = [];
  let confidenceDelta = 0;
  const astByPath = new Map(asts.map((ast) => [ast.path, ast]));

  for (const file of files) {
    const patches = plans.get(file.path) ?? [];
    if (patches.length === 0) {
      continue;
    }

    const maxSpan = Math.max(...patches.map((patch) => patch.range.end - patch.range.start + 1));
    if (maxSpan > maxEditSpanLines) {
      warnings.push(`${file.path}: edit span ${maxSpan} exceeds safety threshold ${maxEditSpanLines}.`);
      confidenceDelta -= 0.2;
    }

    const ast = astByPath.get(file.path);
    if (ast?.syntaxSupported && canParseWithBabel(file.path)) {
      try {
        parseCode(file.path, afterContents.get(file.path) ?? file.content);
      } catch {
        warnings.push(`${file.path}: proposed patch breaks syntax.`);
        confidenceDelta -= 0.4;
      }
    }
  }

  return { warnings, confidenceDelta };
}
