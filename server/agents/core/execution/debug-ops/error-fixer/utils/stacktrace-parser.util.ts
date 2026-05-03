export interface ParsedStackFrame {
  readonly filePath?: string;
  readonly line?: number;
  readonly column?: number;
  readonly raw: string;
}

const STACK_FRAME_REGEX = /(?:at\s+.*\()?([^\s:()]+\.[a-z]+):(\d+):(\d+)\)?/i;

export function parseStacktrace(input: string): readonly ParsedStackFrame[] {
  const lines = input.split(/\r?\n/);
  const frames: ParsedStackFrame[] = [];

  for (const line of lines) {
    const match = line.match(STACK_FRAME_REGEX);
    if (!match) continue;

    frames.push({
      filePath: match[1],
      line: Number.parseInt(match[2], 10),
      column: Number.parseInt(match[3], 10),
      raw: line.trim(),
    });
  }

  return Object.freeze(frames);
}
