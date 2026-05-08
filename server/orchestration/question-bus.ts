/**
 * @deprecated
 * This file is a backward-compatibility re-export.
 * The question-bus has moved to server/chat/pipeline/question-bus.ts
 * All new code should import from there directly.
 */
export { waitForAnswer, resolveQuestion, pendingCount } from "../chat/pipeline/question-bus.ts";
