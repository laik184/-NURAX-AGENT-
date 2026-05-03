import type { FileTree } from "../types.js";

const IN_MEMORY_FILE = "inline.ts";

export function normalizeCodebase(input: string | FileTree): FileTree {
  if (typeof input === "string") {
    return Object.freeze({ [IN_MEMORY_FILE]: normalizeLineEndings(input) });
  }

  const normalized: Record<string, string> = {};
  const paths = Object.keys(input).sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    normalized[path] = normalizeLineEndings(input[path] ?? "");
  }

  return Object.freeze(normalized);
}

export function toSourceFiles(codebase: FileTree): ReadonlyArray<{ readonly filePath: string; readonly content: string }> {
  return Object.keys(codebase)
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => ({ filePath, content: codebase[filePath] }));
}

export function hasTypeScriptFiles(codebase: FileTree): boolean {
  return Object.keys(codebase).some((path) => /\.tsx?$/i.test(path));
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n");
}
