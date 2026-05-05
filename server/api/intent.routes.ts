import { Router, type Request, type Response } from "express";
import { llm } from "../llm/openrouter.client.ts";

const SYSTEM_PROMPT = `You are an intent parser for a code-editing IDE. Given a natural-language request, return STRICT JSON:
{
  "intent": "<short label>",
  "summary": "<1-2 sentence plan>",
  "patches": [
    { "path": "<relative path>", "rationale": "<why>", "kind": "create|edit|delete" }
  ]
}
Do not include any text outside the JSON.`;

export function createIntentRouter(): Router {
  const r = Router();

  r.post("/", async (req: Request, res: Response) => {
    const { prompt, projectId } = (req.body || {}) as { prompt?: string; projectId?: number };
    if (!prompt) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "prompt required" } });
    }
    try {
      const result = await llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ], { temperature: 0.2, maxTokens: 1024 });

      let parsed: unknown = { intent: "unknown", summary: result.content, patches: [] };
      try {
        const start = result.content.indexOf("{");
        const end = result.content.lastIndexOf("}");
        if (start >= 0 && end > start) {
          parsed = JSON.parse(result.content.slice(start, end + 1));
        }
      } catch {
        // fallback: keep wrapper
      }
      res.json({ ok: true, data: { ...(parsed as object), projectId, model: result.model } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "LLM_ERROR", message: e.message } });
    }
  });

  return r;
}
