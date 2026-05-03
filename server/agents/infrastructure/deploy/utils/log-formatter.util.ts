export function formatLog(scope: string, message: string): string {
  return `[${new Date().toISOString()}][${scope}] ${message}`;
}
