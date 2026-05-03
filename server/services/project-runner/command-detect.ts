import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

export async function detectCommand(rootDir: string): Promise<{ cmd: string; args: string[] }> {
  const pkgPath = path.join(rootDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
      const scripts = pkg.scripts || {};
      if (scripts.dev) return { cmd: "npm", args: ["run", "dev"] };
      if (scripts.start) return { cmd: "npm", args: ["start"] };
    } catch {
      /* fall through */
    }
  }
  return { cmd: "npx", args: ["--yes", "serve", "-l", "{PORT}", "."] };
}

export async function ensureNodeModules(rootDir: string): Promise<void> {
  const pkgPath = path.join(rootDir, "package.json");
  if (!existsSync(pkgPath)) return;
  const nm = path.join(rootDir, "node_modules");
  if (existsSync(nm)) return;
  await new Promise<void>((resolve) => {
    const child = spawn("npm", ["install", "--no-audit", "--no-fund", "--silent"], {
      cwd: rootDir,
      stdio: "ignore",
    });
    child.on("exit", () => resolve());
    child.on("error", () => resolve());
  });
}
