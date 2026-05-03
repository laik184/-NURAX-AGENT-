import type { CodeFile } from "../types.js";
import { formatFiles } from "../utils/code-formatter.util.js";
import { createLlmClient, type LlmClient } from "../utils/llm-client.util.js";

interface LlmResponse {
  readonly files?: ReadonlyArray<{ path?: string; content?: string }>;
}

export class CodeWriterAgent {
  constructor(private readonly llmClient: LlmClient = createLlmClient()) {}

  async write(prompt: string, fallbackPaths: readonly string[]): Promise<readonly CodeFile[]> {
    try {
      const raw = await this.llmClient.complete(prompt);
      const parsed = safeJsonParse(raw);
      const files = parsed.files
        ?.filter((file): file is { path: string; content: string } => Boolean(file.path && file.content))
        .map((file) => Object.freeze({ path: file.path, content: file.content }));

      if (files && files.length > 0) {
        return formatFiles(files);
      }
    } catch {
      // Intentionally fall back to deterministic stubs.
    }

    return formatFiles(
      fallbackPaths.map((path) => ({
        path,
        content: `export const placeholder = \"Generated fallback for ${path}\";`,
      })),
    );
  }
}

function safeJsonParse(raw: string): LlmResponse {
  const normalized = raw.trim().replace(/^```json/, "").replace(/```$/, "").trim();
  return JSON.parse(normalized) as LlmResponse;
}
