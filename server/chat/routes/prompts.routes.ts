import { Router } from "express";
import { db } from "../../infrastructure/db/index.ts";
import { projects } from "../../../shared/schema.ts";
import { eq } from "drizzle-orm";

const BASE_PROMPTS: readonly string[] = Object.freeze([
  "Check my app for bugs",
  "Add user authentication",
  "Connect a database",
  "Add payment processing",
  "Write tests for my code",
  "Improve performance",
  "Add dark mode",
  "Create an API endpoint",
]);

const FRAMEWORK_PROMPTS: Readonly<Record<string, string[]>> = Object.freeze({
  react:    ["Add a new React component", "Set up React Router", "Add Zustand state management"],
  nextjs:   ["Add a new Next.js page", "Set up API routes", "Add Server Components"],
  express:  ["Add an Express middleware", "Set up error handling", "Add request validation"],
  vite:     ["Optimize Vite build", "Add HMR config", "Set up path aliases"],
  postgres: ["Add a DB migration", "Create a new table", "Add indexes for performance"],
  vue:      ["Add a Vue component", "Set up Pinia store", "Add Vue Router"],
  svelte:   ["Add a Svelte component", "Set up Svelte store", "Add SvelteKit routing"],
});

async function resolvePrompts(projectId: number): Promise<string[]> {
  const project = await db
    .select({ framework: projects.framework })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const extra: string[] = [];
  if (project?.framework) {
    const fw = project.framework.toLowerCase();
    for (const [key, prompts] of Object.entries(FRAMEWORK_PROMPTS)) {
      if (fw.includes(key)) extra.push(...prompts);
    }
  }

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const p of [...extra, ...BASE_PROMPTS]) {
    if (!seen.has(p)) { seen.add(p); merged.push(p); }
  }
  return merged.slice(0, 8);
}

export function createChatPromptsRouter(): Router {
  const router = Router();

  router.get("/prompts", async (req, res) => {
    const projectId = Number(req.query.projectId) || 1;
    try {
      const prompts = await resolvePrompts(projectId);
      res.json({ ok: true, prompts });
    } catch {
      res.json({ ok: true, prompts: [...BASE_PROMPTS] });
    }
  });

  return router;
}
