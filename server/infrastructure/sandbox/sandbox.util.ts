import path from "path";
import fs from "fs/promises";

const SANDBOX_ROOT = process.env.SANDBOX_ROOT
  ? process.env.SANDBOX_ROOT
  : path.join(process.cwd(), ".data", "sandboxes");

export function getProjectDir(projectId: number): string {
  return path.join(SANDBOX_ROOT, String(projectId));
}

export async function ensureProjectDir(projectId: number): Promise<string> {
  const dir = getProjectDir(projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function isSafePath(projectDir: string, filePath: string): boolean {
  const abs = path.resolve(projectDir, filePath);
  return abs.startsWith(path.resolve(projectDir));
}

export function projectRoot(projectId: number): string {
  return getProjectDir(projectId);
}

export function resolveInSandbox(projectId: number, filePath: string): string {
  const projectDir = getProjectDir(projectId);
  const abs = path.resolve(projectDir, filePath);
  if (!abs.startsWith(path.resolve(projectDir))) {
    throw new Error(`Path escapes sandbox: ${filePath}`);
  }
  return abs;
}

export function resolveSafe(projectDir: string, filePath: string): string {
  const abs = path.resolve(projectDir, filePath);
  if (!abs.startsWith(path.resolve(projectDir))) {
    throw new Error(`Path escapes sandbox: ${filePath}`);
  }
  return abs;
}
