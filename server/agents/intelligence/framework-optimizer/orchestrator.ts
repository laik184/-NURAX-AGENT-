import { runRenderOptimizer } from "./agents/render-optimizer.agent.js";
import { runApiOptimizer } from "./agents/api-optimizer.agent.js";
import { runDatabaseOptimizer } from "./agents/database-optimizer.agent.js";
import { runCachingStrategy } from "./agents/caching-strategy.agent.js";
import { runBundleOptimizer } from "./agents/bundle-optimizer.agent.js";
import { runMiddlewareOptimizer } from "./agents/middleware-optimizer.agent.js";
import { runConcurrencyOptimizer } from "./agents/concurrency-optimizer.agent.js";
import { runBestPracticeEnforcer } from "./agents/best-practice-enforcer.agent.js";
import type { FrameworkSignals, OptimizationResult } from "./types.js";
import { calculateScore } from "./utils/scoring.util.js";
import { buildStateMetrics } from "./utils/metrics.util.js";
import { createFrameworkOptimizerState } from "./state.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";

function validateInput(input: unknown): input is FrameworkSignals {
  if (!input || typeof input !== "object") return false;
  const candidate = input as Record<string, unknown>;
  return typeof candidate["framework"] === "string" && candidate["framework"] !== "";
}

export function optimizeFramework(rawInput: unknown): OptimizationResult {
  if (!validateInput(rawInput)) {
    return deepFreeze({
      success: false,
      issues: [],
      score: 0,
      logs: ["Invalid input: framework string is required."],
    });
  }

  const input = rawInput as FrameworkSignals;
  const logs: string[] = ["Input validated."];

  const issues = [
    ...runRenderOptimizer(input),
    ...runApiOptimizer(input),
    ...runDatabaseOptimizer(input),
    ...runCachingStrategy(input),
    ...runBundleOptimizer(input),
    ...runMiddlewareOptimizer(input),
    ...runConcurrencyOptimizer(input),
    ...runBestPracticeEnforcer(input),
  ];

  logs.push("All optimizer agents executed.");

  const score = calculateScore(issues);
  logs.push(`Final score computed: ${score}.`);

  const metrics = buildStateMetrics(score, issues);
  createFrameworkOptimizerState({
    framework: input.framework,
    metrics,
    timestamp: input.timestamp ?? 0,
  });
  logs.push("State snapshot created.");

  return deepFreeze({
    success: true,
    issues,
    score,
    logs,
  });
}
