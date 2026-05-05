import {
  ensureProjectDir,
  projectRoot,
  relativeToSandbox,
  resolveInSandbox,
  SANDBOX_ROOT,
} from "./sandbox.util.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../../core/orchestrator.types.ts";

const SERVICE = "sandbox";

export { ensureProjectDir, projectRoot, relativeToSandbox, resolveInSandbox, SANDBOX_ROOT };

export async function runSandboxOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  const args = (input.args ?? {}) as { projectId?: string | number; relPath?: string };
  try {
    switch (op) {
      case "root":
        return ok(SERVICE, op, { sandboxRoot: SANDBOX_ROOT });
      case "project-root": {
        if (args.projectId === undefined) return fail(SERVICE, op, "projectId required");
        return ok(SERVICE, op, { root: projectRoot(args.projectId) });
      }
      case "ensure": {
        if (args.projectId === undefined) return fail(SERVICE, op, "projectId required");
        const r = await ensureProjectDir(args.projectId);
        return ok(SERVICE, op, { root: r });
      }
      case "resolve": {
        if (args.projectId === undefined || !args.relPath) return fail(SERVICE, op, "projectId & relPath required");
        return ok(SERVICE, op, { absolute: resolveInSandbox(args.projectId, args.relPath) });
      }
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
