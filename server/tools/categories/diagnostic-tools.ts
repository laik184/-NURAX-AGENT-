import { projectRunner } from "../../services/project-runner.service.ts";
import type { Tool } from "../types.ts";

export const detectMissingPackages: Tool = {
  name: "detect_missing_packages",
  description:
    "Scan the dev server's recent log lines for 'Cannot find module X' and 'Module not found: X' style errors and return the missing module names. Use this before installing.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx) {
    const meta = projectRunner.get(ctx.projectId);
    if (!meta) return { ok: true, result: { missing: [] } };
    const text = meta.lastLines.join("\n");
    const missing = new Set<string>();
    const re1 = /Cannot find module ['"]([^'"]+)['"]/g;
    const re2 = /Module not found:[^'"]*['"]([^'"]+)['"]/g;
    const re3 = /ERR_MODULE_NOT_FOUND[^\n]*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    for (const re of [re1, re2, re3]) {
      while ((m = re.exec(text))) {
        const name = m[1];
        if (name.startsWith(".") || name.startsWith("/")) continue;
        const root = name.startsWith("@")
          ? name.split("/").slice(0, 2).join("/")
          : name.split("/")[0];
        missing.add(root);
      }
    }
    return { ok: true, result: { missing: [...missing] } };
  },
};

export const DIAGNOSTIC_TOOLS: readonly Tool[] = Object.freeze([detectMissingPackages]);
