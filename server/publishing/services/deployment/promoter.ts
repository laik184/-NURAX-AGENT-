import { runtimeManager } from "../../../infrastructure/runtime/runtime-manager.ts";
import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface PromoteResult {
  ok: boolean;
  url: string | null;
  previewOnly: boolean;
  error?: string;
}

/**
 * "Promote" step: starts (or confirms) the dev server for this project
 * and returns its real preview URL.
 *
 * IMPORTANT: This is a dev-preview deployment, NOT a production deployment.
 * A production deployment (*.replit.app or custom domain) requires the
 * platform Deploy button. No production URLs are fabricated here.
 */
export async function promote(
  logger: DeployLogger,
  projectId: number,
): Promise<PromoteResult> {
  logger.info("Starting project server for preview...");

  const alreadyRunning = runtimeManager.isRunning(projectId);

  if (!alreadyRunning) {
    try {
      const startResult = await runtimeManager.start(projectId);
      if (!startResult.ok) {
        const msg = startResult.error ?? "Failed to start project server.";
        logger.error(msg);
        return { ok: false, url: null, previewOnly: true, error: msg };
      }
      logger.info("Server started successfully.");
    } catch (err: any) {
      const msg = err?.message ?? "Unexpected error starting server.";
      logger.error(msg);
      return { ok: false, url: null, previewOnly: true, error: msg };
    }
  } else {
    logger.info("Server already running.");
  }

  const port = runtimeManager.getPort(projectId);
  if (!port) {
    const msg = "Server started but no port was allocated.";
    logger.error(msg);
    return { ok: false, url: null, previewOnly: true, error: msg };
  }

  const url = runtimeManager.previewUrl(projectId, port);

  logger.success(`Project server running on port ${port}.`);
  logger.success(`Preview URL: ${url}`);
  logger.info(
    "NOTE: This is a dev-preview URL. For a permanent production URL, " +
    "use the platform Deploy button.",
  );

  return { ok: true, url, previewOnly: true };
}
