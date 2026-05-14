/**
 * planner.service.ts
 *
 * Calls the LLM to generate a structured execution plan from a user goal.
 * Single responsibility: goal → raw LLM JSON → validated ExecutionPlan.
 */

import type { ExecutionPlan, PlannerInput } from "./planner.types.ts";
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from "./planner.prompts.ts";
import { validatePlan, fallbackPlan } from "./planner.validators.ts";

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const PLANNER_MODEL = "openai/gpt-4o-mini";

async function callPlannerLLM(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set — cannot generate plan.");
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://nura-x.replit.app",
      "X-Title": "NURA X Planner",
    },
    body: JSON.stringify({
      model: PLANNER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Planner LLM error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Planner LLM returned empty response");
  return content;
}

export async function generatePlan(input: PlannerInput): Promise<ExecutionPlan> {
  const userPrompt = buildPlannerUserPrompt(input.goal, input.projectId);

  let rawOutput: string;
  try {
    rawOutput = await callPlannerLLM(PLANNER_SYSTEM_PROMPT, userPrompt, input.signal);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[planner] LLM call failed — using fallback plan: ${msg}`);
    return fallbackPlan(input.goal, input.runId, input.projectId);
  }

  return validatePlan(rawOutput, input.goal, input.runId, input.projectId);
}

/**
 * Determine whether a goal needs planning or can go directly to tool-loop.
 * Simple heuristic: word count and keyword detection.
 */
export function needsPlanning(goal: string): boolean {
  const words = goal.trim().split(/\s+/).length;
  if (words < 15) return false;

  const complexKeywords = [
    "auth", "login", "signup", "register",
    "database", "schema", "migration",
    "payment", "stripe", "billing",
    "dashboard", "admin", "panel",
    "api", "rest", "graphql", "endpoint",
    "deploy", "docker", "container",
    "test", "coverage", "ci",
    "and", "with", "including", "plus",
  ];

  const lower = goal.toLowerCase();
  const matchCount = complexKeywords.filter((kw) => lower.includes(kw)).length;
  return matchCount >= 2 || words >= 40;
}
