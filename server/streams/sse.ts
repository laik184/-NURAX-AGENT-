import { chatOrchestrator } from "../chat/index.ts";
export const createSseRouter = () => chatOrchestrator.buildSseRouter();
