import { chatOrchestrator } from "../chat/index.ts";
export function waitForAnswer(runId: string, questionId: string, defaultAnswer: string) {
  return chatOrchestrator.questions.wait(runId, questionId, defaultAnswer);
}
export function resolveQuestion(runId: string, questionId: string, answer: string) {
  return chatOrchestrator.questions.resolve(runId, questionId, answer);
}
export function pendingCount() {
  return chatOrchestrator.questions.pendingCount();
}
