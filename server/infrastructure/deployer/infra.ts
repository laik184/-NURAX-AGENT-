export interface RuntimeResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: { readonly providerId: string };
}

export interface NetworkRouteResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: { readonly route: string; readonly port: number };
}

export interface DeployContainerResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: { readonly deploymentId: string };
}

export async function provisionRuntime(appId: string): Promise<RuntimeResult> {
  return Object.freeze({
    success: true,
    logs: Object.freeze([`Provisioned runtime for: ${appId}`]),
    data: Object.freeze({ providerId: `runtime-${appId}` }),
  });
}

export async function allocateNetworkRoute(providerId: string): Promise<NetworkRouteResult> {
  return Object.freeze({
    success: true,
    logs: Object.freeze([`Allocated network route for: ${providerId}`]),
    data: Object.freeze({ route: `https://${providerId}.stub`, port: 3000 }),
  });
}

export async function deployContainer(containerId: unknown): Promise<DeployContainerResult> {
  return Object.freeze({
    success: true,
    logs: Object.freeze([`Deployed container: ${String(containerId)}`]),
    data: Object.freeze({ deploymentId: `deploy-${Date.now()}` }),
  });
}
