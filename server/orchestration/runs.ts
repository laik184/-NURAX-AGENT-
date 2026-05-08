import { chatOrchestrator } from "../chat/index.ts";

export function getRunRegistry() {
  return chatOrchestrator.runRegistry;
}

export function getRun(runId: string) {
  return chatOrchestrator.run.get(runId);
}

export function cancelRun(runId: string) {
  return chatOrchestrator.run.cancel(runId);
}
