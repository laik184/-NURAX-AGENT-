const BASE_URL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
// Default to a free-tier tool-calling model so the agent works without a paid
// OpenRouter balance. Override with LLM_MODEL=anthropic/claude-3.5-sonnet (or
// any other) for higher quality once the user has credits.
const DEFAULT_MODEL = process.env.LLM_MODEL || "openai/gpt-oss-120b:free";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatResult {
  content: string;
  model: string;
  finishReason?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return key;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const model = opts.model || DEFAULT_MODEL;
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "HTTP-Referer": "https://nura-x.replit.app",
      "X-Title": "NURA X",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: ChatResult["usage"];
    model?: string;
  };

  const content = json.choices?.[0]?.message?.content || "";
  return {
    content,
    model: json.model || model,
    finishReason: json.choices?.[0]?.finish_reason,
    usage: json.usage,
  };
}

export async function* streamChat(messages: ChatMessage[], opts: ChatOptions = {}): AsyncGenerator<string> {
  const model = opts.model || DEFAULT_MODEL;
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "HTTP-Referer": "https://nura-x.replit.app",
      "X-Title": "NURA X",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenRouter stream error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed
      }
    }
  }
}

// ─── Tool-use / function calling (OpenAI-format, supported by Claude on OpenRouter) ───

export type ToolMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCallResult {
  content: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  finishReason?: string;
  model: string;
  usage?: ChatResult["usage"];
}

export async function chatWithTools(
  messages: ToolMessage[],
  tools: ToolDef[],
  opts: ChatOptions = {},
): Promise<ToolCallResult> {
  const model = opts.model || DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "HTTP-Referer": "https://nura-x.replit.app",
      "X-Title": "NURA X",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenRouter tool-call error ${res.status}: ${txt.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>;
      };
      finish_reason?: string;
    }>;
    usage?: ChatResult["usage"];
    model?: string;
  };

  const msg = json.choices?.[0]?.message;
  return {
    content: msg?.content ?? "",
    toolCalls: (msg?.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    })),
    finishReason: json.choices?.[0]?.finish_reason,
    model: json.model || model,
    usage: json.usage,
  };
}

export const llm = { chat, streamChat, chatWithTools, defaultModel: DEFAULT_MODEL };
