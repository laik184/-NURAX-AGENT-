import type { FileEnvelope, TargetFile } from "../types.js";

export function loadFiles(files: TargetFile[], targetPath?: string): ReadonlyArray<FileEnvelope> {
  return files
    .filter((file) => (targetPath ? file.path === targetPath : true))
    .map((file) => ({
      path: file.path,
      content: normalizeText(file.content),
      lines: normalizeText(file.content).split("\n"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeText(content: string): string {
  return content.replace(/\r\n/g, "\n");
}
