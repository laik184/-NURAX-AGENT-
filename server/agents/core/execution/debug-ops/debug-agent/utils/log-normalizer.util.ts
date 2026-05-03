export const normalizeLog = (value: string): string => value.replace(/\u001b\[[0-9;]*m/g, '').trim();

export const normalizeLogs = (logs: string[]): string[] => logs.map(normalizeLog).filter(Boolean);
