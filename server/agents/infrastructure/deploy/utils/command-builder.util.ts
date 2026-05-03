import type { DeploymentConfig } from "../types.js";

export interface DeploymentCommands {
  readonly build: readonly string[];
  readonly deploy: readonly string[];
  readonly verify: readonly string[];
  readonly rollback: readonly string[];
}

export function buildCommands(config: DeploymentConfig): DeploymentCommands {
  const imageTag = config.imageTag ?? `${config.appId}:${config.environment}`;
  const port = config.port ?? 3000;

  return Object.freeze({
    build: Object.freeze(["npm install", "npm run build"]),
    deploy: Object.freeze([
      `docker build -t ${imageTag} ${config.workspacePath}`,
      `docker run -d -p ${port}:${port} ${imageTag}`,
    ]),
    verify: Object.freeze([`curl -f ${config.serviceUrl ?? `http://localhost:${port}/health`}`]),
    rollback: Object.freeze([`rollback --from ${config.rollbackSnapshotFrom ?? "latest"}`]),
  });
}
