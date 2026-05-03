import { ParsedStackFrame } from '../types.js';

const STACK_PATTERNS: RegExp[] = [
  /^\s*at\s+(?<fn>.+?)\s+\((?<file>.+?):(?<line>\d+):(?<column>\d+)\)\s*$/,
  /^\s*at\s+(?<file>.+?):(?<line>\d+):(?<column>\d+)\s*$/,
  /^(?<fn>.+?)@(?<file>.+?):(?<line>\d+):(?<column>\d+)$/,
];

export const parseStackLine = (line: string): ParsedStackFrame => {
  for (const pattern of STACK_PATTERNS) {
    const match = line.match(pattern);
    if (!match?.groups) {
      continue;
    }

    return {
      raw: line,
      functionName: match.groups.fn,
      file: match.groups.file,
      line: match.groups.line ? Number(match.groups.line) : undefined,
      column: match.groups.column ? Number(match.groups.column) : undefined,
    };
  }

  return { raw: line };
};
