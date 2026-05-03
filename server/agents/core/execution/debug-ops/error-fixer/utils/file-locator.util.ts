import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function readTargetFile(projectRoot: string, filePath: string): Promise<string> {
  const absolutePath = resolve(projectRoot, filePath);
  return readFile(absolutePath, "utf-8");
}
