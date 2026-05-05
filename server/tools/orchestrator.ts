import { TOOLS, TOOL_DEFS, getTool, TERMINAL_TOOL_NAMES } from "./registry.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../core/orchestrator.types.ts";

const SERVICE = "tools";

export { TOOLS, TOOL_DEFS, getTool, TERMINAL_TOOL_NAMES };

export async function runToolsOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  try {
    switch (op) {
      case "list":
        return ok(SERVICE, op, {
          count: TOOLS.length,
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
        });
      case "schemas":
        return ok(SERVICE, op, { count: TOOL_DEFS.length, schemas: TOOL_DEFS });
      case "terminal-names":
        return ok(SERVICE, op, { names: Array.from(TERMINAL_TOOL_NAMES) });
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
