import type { ChangeIntent, IntentOperation, ParsedIntent } from "../types.js";

export function parseIntent(intent: ChangeIntent): ParsedIntent {
  const action = intent.action.trim().toLowerCase();
  const details = intent.details ?? {};
  const ops: IntentOperation[] = [];

  const detail = details as Record<string, unknown>;
  pushStringOp(ops, "replace", detail.before, detail.after);
  pushSingleStringOp(ops, "insert_after", detail.insertAfter, detail.content);
  pushSingleStringOp(ops, "insert_before", detail.insertBefore, detail.content);
  pushUnaryOp(ops, "append", detail.append);
  pushUnaryOp(ops, "prepend", detail.prepend);
  pushUnaryOp(ops, "delete", detail.delete);

  if (isRangeReplace(detail.range)) {
    ops.push({ kind: "range_replace", range: detail.range, content: String(detail.content ?? "") });
  }

  return {
    action,
    targetPath: intent.target?.path,
    targetSymbol: intent.target?.symbol,
    operations: ops,
  };
}

function pushStringOp(ops: IntentOperation[], kind: "replace", before: unknown, after: unknown): void {
  if (typeof before === "string" && typeof after === "string") {
    ops.push({ kind, match: before, content: after });
  }
}

function pushSingleStringOp(
  ops: IntentOperation[],
  kind: "insert_after" | "insert_before",
  match: unknown,
  content: unknown,
): void {
  if (typeof match === "string" && typeof content === "string") {
    ops.push({ kind, match, content });
  }
}

function pushUnaryOp(ops: IntentOperation[], kind: "append" | "prepend" | "delete", content: unknown): void {
  if (typeof content === "string") {
    ops.push({ kind, content, match: kind === "delete" ? content : undefined });
  }
}

function isRangeReplace(value: unknown): value is { start: number; end: number } {
  return typeof value === "object" && value !== null && typeof (value as any).start === "number" && typeof (value as any).end === "number";
}
