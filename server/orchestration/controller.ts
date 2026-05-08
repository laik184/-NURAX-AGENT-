import { chatOrchestrator } from "../chat/index.ts";
export function getOrchestrator() {
  return chatOrchestrator.run;
}
export { chatOrchestrator as orchestrator } from "../chat/index.ts";
