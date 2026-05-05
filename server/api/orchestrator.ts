import { createAgentsRouter } from "./agents.routes.ts";
import { createProjectsRouter } from "./projects.routes.ts";
import { createFsRouter } from "./fs.routes.ts";
import { createRunRouter } from "./run.routes.ts";
import { createDiffRouter } from "./diff.routes.ts";
import { createSoloPilotRouter } from "./solo-pilot.routes.ts";
import { createPreviewRouter } from "./preview.routes.ts";
import { createIntentRouter } from "./intent.routes.ts";
import { createTimelineRouter } from "./timeline.routes.ts";
import { createArtifactsRouter } from "./artifacts.routes.ts";
import { createPublishingRouter } from "./publishing.routes.ts";
import { createFoldersRouter } from "./folders.routes.ts";
import { createInventoryRouter } from "./inventory.routes.ts";
import { createLegacyAliasRouter } from "./legacy-aliases.routes.ts";
import { createCompatRouter } from "./compat.routes.ts";
import { createRuntimeRouter } from "./runtime.routes.ts";
import { createChatRouter } from "./chat.routes.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../core/orchestrator.types.ts";

const SERVICE = "http-routes";

export {
  createAgentsRouter,
  createProjectsRouter,
  createFsRouter,
  createRunRouter,
  createDiffRouter,
  createSoloPilotRouter,
  createPreviewRouter,
  createIntentRouter,
  createTimelineRouter,
  createArtifactsRouter,
  createPublishingRouter,
  createFoldersRouter,
  createInventoryRouter,
  createLegacyAliasRouter,
  createCompatRouter,
  createRuntimeRouter,
  createChatRouter,
};

const ROUTES: ReadonlyArray<{ readonly mount: string; readonly factory: string }> = Object.freeze([
  { mount: "/api/agents", factory: "createAgentsRouter" },
  { mount: "/api/projects", factory: "createProjectsRouter" },
  { mount: "/api/fs", factory: "createFsRouter" },
  { mount: "/api/run", factory: "createRunRouter" },
  { mount: "/api/agent/diff-queue", factory: "createDiffRouter" },
  { mount: "/api/solo-pilot", factory: "createSoloPilotRouter" },
  { mount: "/api/preview", factory: "createPreviewRouter" },
  { mount: "/api/ai/intent", factory: "createIntentRouter" },
  { mount: "/api/timeline", factory: "createTimelineRouter" },
  { mount: "/api/artifacts", factory: "createArtifactsRouter" },
  { mount: "/api/publishing", factory: "createPublishingRouter" },
  { mount: "/api/folders", factory: "createFoldersRouter" },
  { mount: "/api/inventory", factory: "createInventoryRouter" },
  { mount: "/api/chat", factory: "createChatRouter" },
  { mount: "(root)", factory: "createRuntimeRouter" },
  { mount: "(root)", factory: "createLegacyAliasRouter" },
  { mount: "(root)", factory: "createCompatRouter" },
]);

export async function runHttpRoutesOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  try {
    switch (op) {
      case "list":
        return ok(SERVICE, op, { count: ROUTES.length, routes: ROUTES });
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
