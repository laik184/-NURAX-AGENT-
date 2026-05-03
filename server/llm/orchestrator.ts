import { chat, chatWithTools, llm, streamChat } from "./openrouter.client.ts";
import type { ChatMessage, ChatOptions, ChatResult, ToolDef, ToolMessage, ToolCallResult } from "./openrouter.client.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../orchestrator.types.ts";

const SERVICE = "llm-client";

export { chat, chatWithTools, streamChat, llm };
export type { ChatMessage, ChatOptions, ChatResult, ToolDef, ToolMessage, ToolCallResult };

export async function runLlmOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  const args = (input.args ?? {}) as { messages?: ChatMessage[]; tools?: ToolDef[]; options?: ChatOptions };
  try {
    switch (op) {
      case "chat": {
        if (!args.messages?.length) return fail(SERVICE, op, "messages required");
        const r = await chat(args.messages, args.options ?? {});
        return ok(SERVICE, op, r);
      }
      case "chat-with-tools": {
        if (!args.messages?.length) return fail(SERVICE, op, "messages required");
        const r = await chatWithTools(args.messages as ToolMessage[], args.tools ?? [], args.options ?? {});
        return ok(SERVICE, op, r);
      }
      case "info": {
        return ok(SERVICE, op, { defaultModel: llm.defaultModel });
      }
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
