/**
 * console-log-persister.ts
 *
 * Subscribes to bus "console.log" events and persists each line to the
 * `console_logs` DB table.  Called once at server startup from main.ts.
 *
 * We batch inserts: every 500 ms we flush up to 100 buffered lines so we
 * don't hit the DB on every stdout character.
 */

import { bus } from "./bus.ts";
import { db } from "../db/index.ts";
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
    // Non-fatal — log drop is acceptable, never crash the server
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

  // Ensure flush on graceful shutdown
  process.once("SIGTERM", () => flush().catch(() => {}));
  process.once("SIGINT", () => flush().catch(() => {}));

  console.log("[nura-x] console-log-persister: started (500 ms batch flush)");
}
