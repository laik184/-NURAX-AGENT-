/**
 * infrastructure/index.ts
 *
 * These functions previously returned hardcoded stub values ("stub-route",
 * "stub-deploy", "stub-runtime") that silently made every deployment succeed
 * without performing any real infrastructure work.
 *
 * They now return explicit UNSUPPORTED results. Callers that check `.success`
 * will receive `false` with a clear error message instead of a fake success.
 */

const UNSUPPORTED_MSG =
  "Infrastructure provider not configured. " +
  "Production deployment requires an external provider (Replit Deployments, Fly.io, etc.). " +
  "Use the platform Deploy button for a real production URL.";

export async function allocateNetworkRoute(
  _providerId: string,
): Promise<{ success: boolean; logs: readonly string[]; data?: { port: number; route: string }; error?: string }> {
  return Object.freeze({
    success: false,
    logs: Object.freeze(["allocateNetworkRoute: UNSUPPORTED — no infrastructure provider configured."]),
    error: UNSUPPORTED_MSG,
  });
}

export async function deployContainer(
  _containerId: string,
): Promise<{ success: boolean; logs: readonly string[]; error?: string }> {
  return Object.freeze({
    success: false,
    logs: Object.freeze(["deployContainer: UNSUPPORTED — no container orchestrator configured."]),
    error: UNSUPPORTED_MSG,
  });
}

export async function provisionRuntime(
  _appId: string,
): Promise<{ success: boolean; logs: readonly string[]; data?: { providerId: string }; error?: string }> {
  return Object.freeze({
    success: false,
    logs: Object.freeze(["provisionRuntime: UNSUPPORTED — no runtime provider configured."]),
    error: UNSUPPORTED_MSG,
  });
}
