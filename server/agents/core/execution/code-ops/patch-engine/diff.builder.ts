import type { DiffResult, DiffLine } from "./types.js";

function lcsLength(a: string[], b: string[]): number[][] {
  const m   = a.length;
  const n   = b.length;
  const dp  = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? (dp[i - 1]![j - 1] ?? 0) + 1
        : Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
    }
  }
  return dp;
}

function buildHunks(prevLines: string[], currLines: string[]): DiffLine[] {
  const dp    = lcsLength(prevLines, currLines);
  const hunks: DiffLine[] = [];

  let i = prevLines.length;
  let j = currLines.length;
  let ln = 1;

  const pending: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      prevLines[i - 1] === currLines[j - 1]
    ) {
      pending.unshift({ lineNumber: ln++, kind: "unchanged", content: prevLines[i - 1]! });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (dp[i]![j - 1] ?? 0) >= (dp[i - 1]![j] ?? 0))) {
      pending.unshift({ lineNumber: ln++, kind: "added",     content: currLines[j - 1]! });
      j--;
    } else {
      pending.unshift({ lineNumber: ln++, kind: "removed",   content: prevLines[i - 1]! });
      i--;
    }
  }

  hunks.push(...pending);
  return hunks;
}

export function buildDiff(original: string, patched: string): DiffResult {
  const prevLines = original.split("\n");
  const currLines = patched.split("\n");

  if (original === patched) {
    const hunks: DiffLine[] = prevLines.map((content, idx) =>
      Object.freeze({ lineNumber: idx + 1, kind: "unchanged" as const, content }),
    );
    return Object.freeze({
      linesAdded:   0,
      linesRemoved: 0,
      linesChanged: 0,
      hunks:        Object.freeze(hunks),
    });
  }

  const hunks = buildHunks(prevLines, currLines).map((h) => Object.freeze(h));

  const linesAdded   = hunks.filter((h) => h.kind === "added").length;
  const linesRemoved = hunks.filter((h) => h.kind === "removed").length;
  const linesChanged = Math.min(linesAdded, linesRemoved);

  return Object.freeze({
    linesAdded,
    linesRemoved,
    linesChanged,
    hunks: Object.freeze(hunks),
  });
}
