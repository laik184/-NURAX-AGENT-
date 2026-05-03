import { ParsedStackFrame } from '../types.js';

export interface DependencyCheckResult {
  hasDependencyIssue: boolean;
  missingModules: string[];
}

const extractModuleName = (line: string): string | undefined => {
  const match = line.match(/(?:Cannot find module|Module not found:?)(?:\s+|\s*['\"])([^'\"\n]+)/i);
  return match?.[1]?.trim();
};

export const dependencyCheckerAgent = (error: string, logs: string[], frames: ParsedStackFrame[]): DependencyCheckResult => {
  const candidates = [error, ...logs, ...frames.map((frame) => frame.raw)];
  const missingModules = candidates
    .map(extractModuleName)
    .filter((value): value is string => Boolean(value));

  return {
    hasDependencyIssue: missingModules.length > 0,
    missingModules: [...new Set(missingModules)],
  };
};
