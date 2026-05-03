export function buildSimpleUnifiedDiff(path: string, before: string, after: string): string {
  if (before === after) {
    return `--- a/${path}\n+++ b/${path}\n@@ -0,0 +0,0 @@`;
  }

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const removed = beforeLines.map((line) => `-${line}`).join("\n");
  const added = afterLines.map((line) => `+${line}`).join("\n");

  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    removed,
    added,
  ].join("\n");
}
