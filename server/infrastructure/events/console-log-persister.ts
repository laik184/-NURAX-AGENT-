import { chatOrchestrator } from "../../chat/index.ts";
export function startConsoleLogPersister() {
  return chatOrchestrator.startPersistence();
}
