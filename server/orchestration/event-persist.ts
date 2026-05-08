import { chatOrchestrator } from "../chat/index.ts";
export function attachAgentEventPersister() {
  return chatOrchestrator.startPersistence();
}
