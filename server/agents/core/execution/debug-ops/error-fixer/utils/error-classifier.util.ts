import type { ErrorKind } from "../types.js";

const RULES: ReadonlyArray<{ readonly pattern: RegExp; readonly kind: ErrorKind }> = Object.freeze([
  { pattern: /cannot find module|module not found/i, kind: "MODULE_NOT_FOUND" },
  { pattern: /typescript|TS\d+|type error/i, kind: "TYPE" },
  { pattern: /syntaxerror|unexpected token/i, kind: "SYNTAX" },
  { pattern: /build failed|compilation failed/i, kind: "BUILD" },
  { pattern: /referenceerror|typeerror|rangeerror/i, kind: "RUNTIME" },
]);

export function classifyError(message: string): ErrorKind {
  const rule = RULES.find((entry) => entry.pattern.test(message));
  return rule?.kind ?? "UNKNOWN";
}
