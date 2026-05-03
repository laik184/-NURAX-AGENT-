export function buildSimpleDiff(filePath: string, before: string, after: string): string {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

  for (let i = 0; i < maxLen; i += 1) {
    const b = beforeLines[i];
    const a = afterLines[i];

    if (b === a) {
      continue;
    }

    if (b !== undefined) {
      lines.push(`-${b}`);
    }
    if (a !== undefined) {
      lines.push(`+${a}`);
    }
  }

  return lines.join("\n");
}
