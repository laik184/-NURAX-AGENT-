import type { CodeFile } from "../types.js";

export function formatCode(content: string): string {
  return content
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}

export function formatFiles(files: readonly CodeFile[]): readonly CodeFile[] {
  return Object.freeze(
    files.map((file) =>
      Object.freeze({
        path: file.path,
        content: formatCode(file.content),
      }),
    ),
  );
}
