import { createPreviewProxy } from "./preview-proxy.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../orchestrator.types.ts";

const SERVICE = "preview-proxy";

export { createPreviewProxy };

export async function runPreviewProxyOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  try {
    switch (op) {
      case "describe": {
        return ok(SERVICE, op, {
          mountedAt: "/preview/:projectId/*",
          factory: "createPreviewProxy",
          supportsWebSocket: true,
        });
      }
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
