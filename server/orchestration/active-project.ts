import type { Request } from "express";
import { chatOrchestrator } from "../chat/index.ts";
export function resolveProjectId(req: Request) {
  return chatOrchestrator.project.resolveId(req);
}
export function getOrCreateActiveProject() {
  return chatOrchestrator.project.getActive();
}
