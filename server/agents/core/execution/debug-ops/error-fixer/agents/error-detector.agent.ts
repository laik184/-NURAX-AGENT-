import type { ErrorReport } from "../types.js";
import { classifyError } from "../utils/error-classifier.util.js";
import { parseStacktrace } from "../utils/stacktrace-parser.util.js";

let _counter = 0;

function nextErrorId(): string {
  _counter += 1;
  return `error-${Date.now()}-${String(_counter).padStart(4, "0")}`;
}

export function detectErrors(errorText: string): readonly ErrorReport[] {
  const frames = parseStacktrace(errorText);
  const first = frames[0];
  const lines = errorText.split(/\r?\n/).filter(Boolean);

  const report: ErrorReport = Object.freeze({
    id: nextErrorId(),
    kind: classifyError(errorText),
    message: lines[0] ?? "Unknown error",
    filePath: first?.filePath,
    line: first?.line,
    column: first?.column,
    stack: Object.freeze(lines.slice(1)),
    raw: errorText,
  });

  return Object.freeze([report]);
}
