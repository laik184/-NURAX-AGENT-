import path from "path";
import fs from "fs/promises";

const SANDBOX_ROOT = path.resolve(process.cwd(), process.env.AGENT_PROJECT_ROOT || ".sandbox");

export function projectRoot(projectId: number | string): string {
  return path.join(SANDBOX_ROOT, String(projectId));
}

export function resolveInSandbox(projectId: number | string, relPath: string): string {
  const root = projectRoot(projectId);
  const cleaned = (relPath || "").replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, cleaned);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Path escapes sandbox: ${relPath}`);
  }
  return resolved;
}

export async function ensureProjectDir(projectId: number | string): Promise<string> {
  const root = projectRoot(projectId);
  await fs.mkdir(root, { recursive: true });
  return root;
}

export function relativeToSandbox(projectId: number | string, absPath: string): string {
  return path.relative(projectRoot(projectId), absPath);
}

export { SANDBOX_ROOT };
