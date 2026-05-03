import { ParsedStackTrace } from '../types.js';
import { normalizeLogs } from '../utils/log-normalizer.util.js';
import { parseStackLine } from '../utils/regex-parser.util.js';

export const stacktraceParserAgent = (error: string, logs: string[] = [], stacktrace: string[] = []): ParsedStackTrace => {
  const normalizedInput = normalizeLogs([error, ...logs, ...stacktrace]);
  const stackLines = normalizedInput.filter((line) => line.includes('at ') || /:\d+:\d+/.test(line));

  const frames = stackLines.map(parseStackLine);

  return {
    normalized: normalizedInput,
    frames,
  };
};
