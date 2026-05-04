import type { FixPlan, AutoFixStrategyAgent, SmellItem, FixStrategy } from "../types.js";
import type { PatchType } from "../../patch-engine/index.js";

const PATCH_BY_SMELL: Readonly<Record<string, PatchType>> = Object.freeze({
  "large-file": "ASYNC_REFACTOR",
  "god-class": "WORKER_THREAD_INJECTION",
  "high-complexity": "ASYNC_REFACTOR",
  "deep-nesting": "SYNC_REDUCTION",
  "tight-coupling": "PAYLOAD_OPTIMIZATION",
  "duplicate-logic": "SYNC_REDUCTION",
  "large-controller": "WORKER_THREAD_INJECTION",
  "excessive-deps": "CACHE_INJECTION",
});

export function createFixPlans(
  smells: ReadonlyArray<SmellItem>,
  strategyAgent: AutoFixStrategyAgent,
  runtime: string,
  iteration: number,
  maxIterations: number,
): ReadonlyArray<FixPlan> {
  const sorted = [...smells].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    return a.kind.localeCompare(b.kind);
  });

  return Object.freeze(sorted.map((smell, index) => {
    const strategyResult = strategyAgent.analyze(
      `code-fixer-${iteration}-${index}`,
      { message: smell.description, code: smell.kind },
      { runtime, retryCount: Math.max(iteration - 1, 0), maxRetries: maxIterations },
    );

    const strategy: FixStrategy = strategyResult.ok && strategyResult.data
      ? strategyResult.data
      : { action: "NO_ACTION", reason: strategyResult.error ?? "Fallback", confidence: 0.1 };

    return Object.freeze({
      filePath: smell.filePath,
      smell,
      strategy,
      patchType: PATCH_BY_SMELL[smell.kind] ?? "ASYNC_REFACTOR",
      targetHint: smell.description,
    });
  }));
}
