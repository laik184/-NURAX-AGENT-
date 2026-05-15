import { bus } from "../../infrastructure/events/bus.ts";
import type { DeployStepId, DeployStepStatus, DeploymentStatus, LogLevel } from "../types.ts";

export type DeployEventType =
  | "deploy:started"
  | "deploy:step:update"
  | "deploy:log"
  | "deploy:completed"
  | "deploy:failed"
  | "deploy:status:changed"
  | "deploy:app:restart"
  | "deploy:app:shutdown"
  | "deploy:scan:started"
  | "deploy:scan:completed";

export interface DeployStartedEvent {
  type: "deploy:started";
  projectId: number;
  deploymentId: number;
  ts: number;
}

export interface DeployStepUpdateEvent {
  type: "deploy:step:update";
  deploymentId: number;
  stepId: DeployStepId;
  status: DeployStepStatus;
  error?: string;
  ts: number;
}

export interface DeployLogEvent {
  type: "deploy:log";
  deploymentId: number;
  level: LogLevel;
  message: string;
  ts: number;
}

export interface DeployCompletedEvent {
  type: "deploy:completed";
  deploymentId: number;
  projectId: number;
  url: string;
  ts: number;
}

export interface DeployFailedEvent {
  type: "deploy:failed";
  deploymentId: number;
  projectId: number;
  error: string;
  ts: number;
}

export interface DeployStatusChangedEvent {
  type: "deploy:status:changed";
  deploymentId: number;
  projectId: number;
  status: DeploymentStatus;
  ts: number;
}

export interface DeployScanCompletedEvent {
  type: "deploy:scan:completed";
  deploymentId: number;
  issueCount: number;
  criticalCount: number;
  ts: number;
}

export type DeployEvent =
  | DeployStartedEvent
  | DeployStepUpdateEvent
  | DeployLogEvent
  | DeployCompletedEvent
  | DeployFailedEvent
  | DeployStatusChangedEvent
  | DeployScanCompletedEvent;

export function emitDeployEvent(event: DeployEvent): void {
  bus.emit(event.type as any, event as any);
}

export function onDeployLog(
  handler: (evt: DeployLogEvent) => void
): () => void {
  bus.on("deploy:log" as any, handler as any);
  return () => bus.off("deploy:log" as any, handler as any);
}

export function onDeployStepUpdate(
  handler: (evt: DeployStepUpdateEvent) => void
): () => void {
  bus.on("deploy:step:update" as any, handler as any);
  return () => bus.off("deploy:step:update" as any, handler as any);
}
