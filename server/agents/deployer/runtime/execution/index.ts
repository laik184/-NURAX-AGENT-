export async function runBuildProcess(workspacePath: string): Promise<{ success: boolean; output: string; exitCode: number }> {
  return { success: true, output: '', exitCode: 0 };
}

export async function buildContainerImage(config: unknown): Promise<{ success: boolean; imageId: string }> {
  return { success: true, imageId: 'stub-image' };
}

export async function runContainer(config: unknown): Promise<{ success: boolean; containerId: string }> {
  return { success: true, containerId: 'stub-container' };
}
