import { bus } from "./bus.ts";
import type { AgentEvent, ConsoleEvent, FileChangeEvent, RunLifecycleEvent } from "./bus.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../orchestrator.types.ts";

const SERVICE = "event-bus";

export { bus };
export type { AgentEvent, ConsoleEvent, FileChangeEvent, RunLifecycleEvent };

export async function runEventBusOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  const args = input.args ?? {};
  try {
    switch (op) {
      case "emit-agent": {
        bus.emit("agent.event", args as unknown as AgentEvent);
        return ok(SERVICE, op, { emitted: "agent.event" });
      }
      case "emit-console": {
        bus.emit("console.log", args as unknown as ConsoleEvent);
        return ok(SERVICE, op, { emitted: "console.log" });
      }
      case "emit-lifecycle": {
        bus.emit("run.lifecycle", args as unknown as RunLifecycleEvent);
        return ok(SERVICE, op, { emitted: "run.lifecycle" });
      }
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
