export interface BuildProcessResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: { readonly buildPath: string };
}

export interface ContainerImageResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: { readonly imageTag: string };
}

export interface ContainerRunResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: { readonly containerId: string };
}

export async function runBuildProcess(workspacePath: string): Promise<BuildProcessResult> {
  return Object.freeze({
    success: true,
    logs: Object.freeze([`Build started for: ${workspacePath}`]),
    data: Object.freeze({ buildPath: `${workspacePath}/dist` }),
  });
}

export async function buildContainerImage(workspacePath: string, imageTag: string): Promise<ContainerImageResult> {
  return Object.freeze({
    success: true,
    logs: Object.freeze([`Built image: ${imageTag}`]),
    data: Object.freeze({ imageTag }),
  });
}

export async function runContainer(imageTag: string, port: number, name: string): Promise<ContainerRunResult> {
  return Object.freeze({
    success: true,
    logs: Object.freeze([`Started container: ${name} on port ${port}`]),
    data: Object.freeze({ containerId: `${name}-${Date.now()}` }),
  });
}
