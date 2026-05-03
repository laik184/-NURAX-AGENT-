import { GitLogEntry } from '../types.js';

export const parseBranchList = (stdout: string): string[] =>
  stdout
    .split('\n')
    .map((line) => line.replace('*', '').trim())
    .filter(Boolean);

export const parseStatus = (stdout: string): { clean: boolean; summary: string[] } => {
  const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    clean: lines.some((line) => line.includes('nothing to commit')),
    summary: lines,
  };
};

export const parseLog = (stdout: string): GitLogEntry[] =>
  stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...messageParts] = line.split('|');
      return {
        hash,
        author,
        date,
        message: messageParts.join('|'),
      };
    });
