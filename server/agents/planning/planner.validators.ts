/**
 * planner.validators.ts
 *
 * Validates and normalizes the raw LLM output into a typed ExecutionPlan.
 * Guards against hallucinated fields, missing arrays, and bad types.
 */

import type {
  ExecutionPlan,
  ExecutionPhase,
  AppType,
  Complexity,
  ExecutionStrategy,
} from "./planner.types.ts";

const VALID_APP_TYPES = new Set<AppType>([
  "saas", "api", "fullstack", "cli", "library", "static", "mobile", "script", "unknown",
]);
const VALID_COMPLEXITY = new Set<Complexity>([
  "trivial", "simple", "moderate", "complex", "large",
]);
const VALID_STRATEGY = new Set<ExecutionStrategy>([
  "single-pass", "phased", "iterative",
]);

function parseRaw(raw: string): unknown {
  const trimmed = raw.trim();
  const stripped = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(stripped);
}

function validatePhase(raw: unknown, index: number): ExecutionPhase {
  const p = raw as Record<string, unknown>;
  return {
    id: typeof p.id === "string" ? p.id : `phase-${index + 1}`,
    title: typeof p.title === "string" ? p.title : `Phase ${index + 1}`,
    objective: typeof p.objective === "string" ? p.objective : "Execute task",
    dependencies: Array.isArray(p.dependencies)
      ? (p.dependencies as string[]).filter((d) => typeof d === "string")
      : [],
    files: Array.isArray(p.files)
      ? (p.files as string[]).filter((f) => typeof f === "string")
      : [],
    tools: Array.isArray(p.tools)
      ? (p.tools as string[]).filter((t) => typeof t === "string")
      : [],
    verification:
      typeof p.verification === "string" ? p.verification : "Check output for errors",
    priority: typeof p.priority === "number" ? p.priority : index + 1,
    estimatedSteps:
      typeof p.estimatedSteps === "number" ? Math.max(1, p.estimatedSteps) : 8,
  };
}

export function validatePlan(
  rawOutput: string,
  goal: string,
  runId: string,
  projectId: number
): ExecutionPlan {
  let parsed: unknown;
  try {
    parsed = parseRaw(rawOutput);
  } catch {
    return fallbackPlan(goal, runId, projectId);
  }

  const p = parsed as Record<string, unknown>;

  const appType: AppType = VALID_APP_TYPES.has(p.appType as AppType)
    ? (p.appType as AppType)
    : "unknown";

  const estimatedComplexity: Complexity = VALID_COMPLEXITY.has(
    p.estimatedComplexity as Complexity
  )
    ? (p.estimatedComplexity as Complexity)
    : "moderate";

  const executionStrategy: ExecutionStrategy = VALID_STRATEGY.has(
    p.executionStrategy as ExecutionStrategy
  )
    ? (p.executionStrategy as ExecutionStrategy)
    : "phased";

  const stack = Array.isArray(p.stack)
    ? (p.stack as string[]).filter((s) => typeof s === "string")
    : [];

  const risks = Array.isArray(p.risks)
    ? (p.risks as string[]).filter((r) => typeof r === "string")
    : [];

  const phases: ExecutionPhase[] = Array.isArray(p.phases)
    ? (p.phases as unknown[]).map((ph, i) => validatePhase(ph, i))
    : [fallbackPhase(goal)];

  const sorted = [...phases].sort((a, b) => a.priority - b.priority);

  return {
    goal,
    appType,
    stack,
    phases: sorted,
    risks,
    estimatedComplexity,
    executionStrategy,
    generatedAt: Date.now(),
    runId,
    projectId,
  };
}

function fallbackPhase(goal: string): ExecutionPhase {
  return {
    id: "phase-1",
    title: "Execute goal",
    objective: goal.slice(0, 200),
    dependencies: [],
    files: [],
    tools: ["file_write", "shell_exec"],
    verification: "Check that the task completed without errors",
    priority: 1,
    estimatedSteps: 15,
  };
}

export function fallbackPlan(
  goal: string,
  runId: string,
  projectId: number
): ExecutionPlan {
  return {
    goal,
    appType: "unknown",
    stack: [],
    phases: [fallbackPhase(goal)],
    risks: ["Planner could not parse goal — using single-phase fallback"],
    estimatedComplexity: "moderate",
    executionStrategy: "single-pass",
    generatedAt: Date.now(),
    runId,
    projectId,
  };
}
