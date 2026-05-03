import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { GenerationFile } from "../types.js";

export function writeGeneratedFiles(files: readonly GenerationFile[]): readonly string[] {
  const writtenPaths: string[] = [];

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content, "utf8");
    writtenPaths.push(file.path);
  }

  return Object.freeze([...writtenPaths]);
}
