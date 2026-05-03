import { Router } from "express";
import { registerLegacyFileRoutes } from "./compat/legacy-files.routes.ts";
import { registerFilesModalRoutes } from "./compat/files-modal.routes.ts";
import { registerProjectRoutes } from "./compat/project.routes.ts";
import { registerGitCompatRoutes } from "./compat/git-compat.routes.ts";
import { registerWebGenerateRoutes } from "./compat/web-generate.routes.ts";
import { registerFsHistoryRoutes } from "./compat/fs-history.routes.ts";
import { registerAgentQueueRoutes } from "./compat/agent-queue.routes.ts";
import { registerSolopilotRoutes } from "./compat/solopilot.routes.ts";
import { registerMobileRoutes } from "./compat/mobile.routes.ts";

/**
 * Compatibility router for legacy endpoints the standalone frontend expects.
 * All file ops are sandboxed through `.sandbox/<projectId>/`.
 * All responses follow the normalized `{ ok, data?, error? }` shape.
 *
 * The handlers themselves live in thematic files under `./compat/`. This file
 * just assembles them onto a single Router so `main.ts` and the platform-services
 * http-routes orchestrator continue to import from one place.
 */
export function createCompatRouter(): Router {
  const r = Router();
  registerLegacyFileRoutes(r);
  registerFilesModalRoutes(r);
  registerProjectRoutes(r);
  registerGitCompatRoutes(r);
  registerWebGenerateRoutes(r);
  registerFsHistoryRoutes(r);
  registerAgentQueueRoutes(r);
  registerSolopilotRoutes(r);
  registerMobileRoutes(r);
  return r;
}
