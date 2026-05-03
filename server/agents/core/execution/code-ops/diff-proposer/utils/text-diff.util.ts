export interface UnifiedDiffInput {
  filePath: string;
  before: string;
  after: string;
}

export function buildUnifiedDiff(input: UnifiedDiffInput): string {
  const beforeLines = splitLines(input.before);
  const afterLines = splitLines(input.after);

  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
    start += 1;
  }

  let beforeEnd = beforeLines.length - 1;
  let afterEnd = afterLines.length - 1;
  while (beforeEnd >= start && afterEnd >= start && beforeLines[beforeEnd] === afterLines[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const oldChunk = beforeLines.slice(start, beforeEnd + 1);
  const newChunk = afterLines.slice(start, afterEnd + 1);
  const oldStart = start + 1;
  const newStart = start + 1;

  const lines = [
    `--- a/${input.filePath}`,
    `+++ b/${input.filePath}`,
    `@@ -${oldStart},${Math.max(oldChunk.length, 0)} +${newStart},${Math.max(newChunk.length, 0)} @@`,
    ...oldChunk.map((line) => `-${line}`),
    ...newChunk.map((line) => `+${line}`),
  ];

  return lines.join("\n");
}

export function splitLines(value: string): string[] {
  return value.replace(/\r\n/g, "\n").split("\n");
}
