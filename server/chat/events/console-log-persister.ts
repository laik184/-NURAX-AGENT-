/**
 * console-log-persister.ts
 *
 * Subscribes to bus "console.log" events and persists each line to the
 * `console_logs` DB table. Called once at server startup via ChatOrchestrator.
 *
 * Batches inserts every 500 ms (up to 100 lines) to avoid per-character DB hits.
 */

import { bus } from "../../infrastructure/events/bus.ts";
import { db } from "../../infrastructure/db/index.ts";
import { consoleLogs } from "../../../shared/schema.ts";

interface PendingLog {
  projectId: number;
  stream: string;
  line: string;
  ts: Date;
}

const FLUSH_INTERVAL_MS = 500;
const MAX_BATCH = 100;

let buffer: PendingLog[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, MAX_BATCH);
  try {
    await db.insert(consoleLogs).values(
      batch.map((b) => ({
        projectId: b.projectId,
        stream: b.stream,
        line: b.line,
        ts: b.ts,
      }))
    );
  } catch (err: any) {
    console.warn("[nura-x] console-log-persister flush error:", err.message);
  }
}

export function startConsoleLogPersister(): void {
  bus.on("console.log", (event) => {
    buffer.push({
      projectId: event.projectId,
      stream: event.stream,
      line: event.line,
      ts: new Date(event.ts),
    });
  });

  flushTimer = setInterval(() => {
    flush().catch(() => {});
  }, FLUSH_INTERVAL_MS);

  process.once("SIGTERM", () => flush().catch(() => {}));
  process.once("SIGINT", () => flush().catch(() => {}));

  console.log("[nura-x] console-log-persister: started (500 ms batch flush)");
}
