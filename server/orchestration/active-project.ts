import type { Request } from "express";
import { db } from "../db/index.ts";
import { projects } from "../../shared/schema.ts";
import { desc, eq } from "drizzle-orm";
import { ensureProjectDir, projectRoot } from "../sandbox/sandbox.util.ts";

/**
 * Resolves the project for a request. Falls back to most recently used
 * project, or auto-creates a default one. This lets the frontend run
 * without explicitly tracking projectId everywhere.
 */
export async function resolveProjectId(req: Request): Promise<number> {
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
      if (exists) return n;
      // Lazy-create the row so the explicit id is honored.
      try {
        await db
          .insert(projects)
          .values({
            id: n,
            name: `Project ${n}`,
            description: "Auto-created on first use",
            framework: "nodejs",
            sandboxPath: projectRoot(n),
          })
          .onConflictDoNothing();
        await ensureProjectDir(n);
        return n;
      } catch {
        /* fall through to default */
      }
    }
  }
  return getOrCreateActiveProject();
}

export async function getOrCreateActiveProject(): Promise<number> {
  const [latest] = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(1);
  if (latest) return latest.id;

  const [created] = await db
    .insert(projects)
    .values({
      name: "My Project",
      description: "Auto-created default project",
      framework: "nodejs",
      sandboxPath: "",
    })
    .returning();
  await db
    .update(projects)
    .set({ sandboxPath: projectRoot(created.id) })
    .where(eq(projects.id, created.id));
  await ensureProjectDir(created.id);
  return created.id;
}
