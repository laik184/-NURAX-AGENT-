import type { Request } from "express";
import { db } from "../infrastructure/db/index.ts";
import { projects } from "../../shared/schema.ts";
import { desc, eq } from "drizzle-orm";

/**
 * Resolves the projectId for a request from body / query / header.
 * Returns the numeric projectId if found in the DB, otherwise null.
 *
 * IMPORTANT: This function NEVER auto-creates any project.
 * Routes that need a valid projectId must check for null and return 400.
 */
export async function resolveProjectId(req: Request): Promise<number | null> {
  const fromHeader = req.headers["x-project-id"];
  const fromQuery = req.query?.projectId;
  const fromBody = (req.body as Record<string, unknown> | undefined)?.projectId;
  const raw =
    (fromBody as string | number | undefined) ??
    (fromQuery as string | number | undefined) ??
    (Array.isArray(fromHeader) ? fromHeader[0] : (fromHeader as string | undefined));

  if (raw !== undefined && raw !== null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      const [exists] = await db.select().from(projects).where(eq(projects.id, n));
      return exists ? n : null;
    }
  }

  // No explicit id — return most recently updated project, or null
  const [latest] = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(1);
  return latest?.id ?? null;
}

/**
 * Returns the most recently used project id, or null if none exist.
 * Does NOT auto-create any project.
 */
export async function getOrCreateActiveProject(): Promise<number | null> {
  const [latest] = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(1);
  return latest?.id ?? null;
}
