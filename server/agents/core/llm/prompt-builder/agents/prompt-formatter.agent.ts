import type { PromptContext } from "../types.js";
import { joinBlocks, sectionTemplate } from "../utils/template.util.js";

function formatContext(context: readonly PromptContext[]): string {
  if (context.length === 0) return "No additional context provided.";

  return context
    .map((entry, index) => `(${index + 1}) [priority=${entry.priority}] ${entry.content}`)
    .join("\n");
}

export function formatPrompt(
  systemPrompt: string,
  userPrompt: string,
  context: readonly PromptContext[],
): string {
  return joinBlocks([
    sectionTemplate("SYSTEM", systemPrompt),
    sectionTemplate("CONTEXT", formatContext(context)),
    sectionTemplate("USER", userPrompt),
  ]);
}
