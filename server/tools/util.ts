import path from "node:path";

export const ARG_DENY_RE = /[;&|`<>(){}\\]/;

export const SHELL_ALLOW = new Set([
  "node", "npm", "npx", "pnpm", "yarn", "tsx", "tsc", "vite",
  "git", "ls", "cat", "head", "tail", "echo", "pwd",
  "mkdir", "touch", "wc", "grep", "find", "which", "rm", "mv", "cp",
  "python", "python3", "pip",
]);

export function safeJoin(root: string, p: string): string {
  const abs = path.resolve(root, p);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error(`Path escapes sandbox: ${p}`);
  }
  return abs;
}

export function asString(v: unknown, name: string): string {
  if (typeof v !== "string" || !v) throw new Error(`${name} is required and must be a string`);
  return v;
}

export function asStringArray(v: unknown, name: string): string[] {
  if (!Array.isArray(v)) throw new Error(`${name} must be an array of strings`);
  return v.map((x) => {
    if (typeof x !== "string") throw new Error(`${name} items must be strings`);
    return x;
  });
}

export function trimOutput(s: string): string {
  return s.length > 8000 ? s.slice(0, 4000) + "\n... [truncated] ...\n" + s.slice(-4000) : s;
}
