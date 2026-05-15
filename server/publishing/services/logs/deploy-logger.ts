import { logStore } from "./log-store.ts";
import { emitDeployEvent } from "../../events/deploy-events.ts";
import type { LogLevel, DeployLogEntry } from "../../types.ts";

export class DeployLogger {
  constructor(private readonly deploymentId: number) {}

  private write(level: LogLevel, message: string): DeployLogEntry {
    const entry = logStore.append(this.deploymentId, level, message);
    emitDeployEvent({
      type: "deploy:log",
      deploymentId: this.deploymentId,
      level,
      message,
      ts: Date.now(),
    });
    return entry;
  }

  info(message: string): void {
    this.write("INFO", message);
  }

  success(message: string): void {
    this.write("SUCCESS", message);
  }

  warn(message: string): void {
    this.write("WARNING", message);
  }

  error(message: string): void {
    this.write("ERROR", message);
  }
}

export function createDeployLogger(deploymentId: number): DeployLogger {
  return new DeployLogger(deploymentId);
}
