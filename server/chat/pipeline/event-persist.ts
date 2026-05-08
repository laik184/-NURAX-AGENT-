import { db } from "../../infrastructure/db/index.ts";
import { agentEvents } from "../../../shared/schema.ts";
import { bus } from "../../infrastructure/events/bus.ts";

let attached = false;

/**
 * Attach a single global subscriber that persists every `agent.event` emitted
 * on the bus. Idempotent — subsequent calls are no-ops.
 */
export function attachAgentEventPersister(): void {
  if (attached) return;
  attached = true;
  bus.on("agent.event", (evt) => {
    if (!evt.runId) return;
    void db
      .insert(agentEvents)
      .values({
        runId: evt.runId,
        phase: evt.phase,
        agentName: evt.agentName,
        eventType: evt.eventType as any,
        payload: (evt.payload ?? null) as any,
      })
      .catch(() => undefined);
  });
}
