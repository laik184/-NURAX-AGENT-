import { packageManager } from "../../services/package-manager.service.ts";
import type { Tool } from "../types.ts";
import { asStringArray } from "../util.ts";

export const packageInstall: Tool = {
  name: "package_install",
  description:
    "Install npm packages into the project sandbox. Pass an empty array to run a plain `npm install` (uses existing package.json).",
  parameters: {
    type: "object",
    properties: {
      packages: { type: "array", items: { type: "string" }, description: "Packages to install. Empty for plain install." },
      dev: { type: "boolean", description: "Save as devDependencies." },
    },
    required: ["packages"],
  },
  async run(args, ctx) {
    const pkgs = asStringArray(args.packages, "packages");
    const dev = args.dev === true;
    const result = await packageManager.install(ctx.projectId, pkgs, { dev });
    return {
      ok: result.ok,
      result: {
        installed: result.installed ?? [],
        exitCode: result.exitCode,
        stdoutTail: result.stdout.slice(-2000),
        stderrTail: result.stderr.slice(-2000),
      },
      error: result.ok ? undefined : `npm install exited ${result.exitCode}`,
    };
  },
};

export const PACKAGE_TOOLS: readonly Tool[] = Object.freeze([packageInstall]);
