import type { TextRange } from "../types.js";

export function toLineRange(source: string, startOffset: number, endOffset: number): TextRange {
  const starts = lineStarts(source);
  return {
    start: findLine(starts, startOffset),
    end: findLine(starts, Math.max(startOffset, endOffset)),
  };
}

export function overlaps(a: TextRange, b: TextRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export function clampRange(range: TextRange, lineCount: number): TextRange {
  return {
    start: Math.max(1, Math.min(range.start, lineCount)),
    end: Math.max(1, Math.min(range.end, lineCount)),
  };
}

function lineStarts(text: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

function findLine(starts: number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (starts[mid] <= offset) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hi + 1;
}
