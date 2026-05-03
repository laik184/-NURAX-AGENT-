export interface ParsedError {
  readonly message: string;
  readonly type: string;
  readonly stack: readonly string[];
  readonly errorCode?: string;
  readonly originFile?: string;
  readonly originLine?: number;
}

export function parseError(error: string | Error): ParsedError {
  const raw = error instanceof Error ? error : new Error(String(error));
  const message = raw.message || String(error);
  const stack = (raw.stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== message);

  const type = extractErrorType(message, raw.name);
  const errorCode = extractErrorCode(message);
  const { file, line } = extractOrigin(stack);

  return Object.freeze({
    message,
    type,
    stack: Object.freeze(stack),
    ...(errorCode ? { errorCode } : {}),
    ...(file ? { originFile: file } : {}),
    ...(line !== undefined ? { originLine: line } : {}),
  });
}

function extractErrorType(message: string, name?: string): string {
  if (name && name !== "Error") return name;
  const lower = message.toLowerCase();
  if (lower.includes("timeout"))     return "TimeoutError";
  if (lower.includes("permission") || lower.includes("eacces")) return "PermissionError";
  if (lower.includes("econnrefused") || lower.includes("network")) return "NetworkError";
  if (lower.includes("cannot find module") || lower.includes("enoent")) return "DependencyError";
  if (lower.includes("syntaxerror") || lower.includes("unexpected token")) return "SyntaxError";
  if (lower.includes("out of memory") || lower.includes("heap")) return "MemoryError";
  if (lower.includes("runtime"))     return "RuntimeError";
  return "UnknownError";
}

function extractErrorCode(message: string): string | undefined {
  const match = message.match(/\b(E[A-Z]{2,}|ERR_[A-Z_]+)\b/);
  return match ? match[1] : undefined;
}

function extractOrigin(stack: string[]): { file?: string; line?: number } {
  const frameLine = stack.find((l) => l.startsWith("at ") && !l.includes("node_modules"));
  if (!frameLine) return {};
  const match = frameLine.match(/\((.+):(\d+):\d+\)/) ?? frameLine.match(/at (.+):(\d+):\d+/);
  if (!match) return {};
  return { file: match[1], line: parseInt(match[2], 10) };
}

export function extractErrorMessage(error: string | Error): string {
  return error instanceof Error ? error.message : String(error);
}
