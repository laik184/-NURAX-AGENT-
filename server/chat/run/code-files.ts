import fs from "fs/promises";
import path from "path";
import { db } from "../../infrastructure/db/index.ts";
import { diffQueue, artifacts } from "../../../shared/schema.ts";
import { bus, type AgentEvent } from "../../infrastructure/events/bus.ts";
import { ensureProjectDir, resolveInSandbox } from "../../infrastructure/sandbox/sandbox.util.ts";
import type { CodeFile } from "./types.ts";

/**
 * Recursively walks any phase.data shape and collects CodeFile-shaped objects.
 */
export function extractCodeFiles(data: unknown, seen = new WeakSet<object>()): CodeFile[] {
  if (data == null) return [];
  if (typeof data !== "object") return [];
  if (seen.has(data as object)) return [];
  seen.add(data as object);

  if (Array.isArray(data)) {
    const out: CodeFile[] = [];
    for (const item of data) out.push(...extractCodeFiles(item, seen));
    return out;
  }

  const obj = data as Record<string, unknown>;
  if (
    typeof obj.path === "string" &&
    typeof obj.content === "string" &&
    obj.path.length > 0
  ) {
    return [{ path: obj.path, content: obj.content }];
  }

  const out: CodeFile[] = [];
  for (const value of Object.values(obj)) {
    out.push(...extractCodeFiles(value, seen));
  }
  return out;
}

export async function writeFiles(projectId: number, files: CodeFile[], runId: string): Promise<void> {
  await ensureProjectDir(projectId);
  for (const file of files) {
    const abs = resolveInSandbox(projectId, file.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });

    let oldContent: string | null = null;
    try {
      oldContent = await fs.readFile(abs, "utf-8");
    } catch {
      oldContent = null;
    }

    await fs.writeFile(abs, file.content, "utf-8");

    await db.insert(diffQueue).values({
      projectId,
      filePath: file.path,
      oldContent,
      newContent: file.content,
      status: "pending",
    });

    await db.insert(artifacts).values({
      projectId,
      kind: "code",
      path: file.path,
      meta: { runId } as any,
    });

    const evt: AgentEvent = {
      runId,
      projectId,
      phase: "generation",
      eventType: "file.written",
      payload: { path: file.path, bytes: file.content.length },
      ts: Date.now(),
    };
    bus.emit("agent.event", evt);
  }
}
