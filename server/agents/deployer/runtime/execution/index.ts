/**
 * execution/index.ts
 *
 * These functions previously returned hardcoded stub values that made the
 * deployment system appear successful without doing any real work.
 *
 * They now return explicit UNSUPPORTED results so every caller receives an
 * honest failure rather than a silent false-positive.
 *
 * Real deployment capability requires an external deployment provider
 * (e.g. Replit Deployments, Fly.io, Railway). Until one is integrated,
 * all container/image operations are unsupported.
 */

const UNSUPPORTED_MSG =
  "Deployment provider not configured. " +
  "This platform does not support automated container-based deployment. " +
  "Use the platform Deploy button for production hosting.";

export async function runBuildProcess(
  _workspacePath: string,
): Promise<{ success: boolean; logs: readonly string[]; data?: { buildPath: string }; error?: string }> {
  return Object.freeze({
    success: false,
    logs: Object.freeze(["runBuildProcess: UNSUPPORTED — no deployment provider configured."]),
    error: UNSUPPORTED_MSG,
  });
}

export async function buildContainerImage(
  _workspacePath: string,
  _imageTag: string,
): Promise<{ success: boolean; logs: readonly string[]; data?: { imageTag: string }; error?: string }> {
  return Object.freeze({
    success: false,
    logs: Object.freeze(["buildContainerImage: UNSUPPORTED — no container runtime available."]),
    error: UNSUPPORTED_MSG,
  });
}

export async function runContainer(
  _imageTag: string,
  _port: number,
  _name: string,
): Promise<string> {
  throw new Error(UNSUPPORTED_MSG);
}
