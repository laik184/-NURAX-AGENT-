import type { FixableViolation, FixAction } from "../types.js";
import { LayerViolationStrategy } from "../strategies/layer-violation.strategy.js";
import { DependencyCycleStrategy } from "../strategies/dependency-cycle.strategy.js";
import { DomainLeakageStrategy } from "../strategies/domain-leakage.strategy.js";
import { SrpViolationStrategy } from "../strategies/srp-violation.strategy.js";

const strategies = [
  new LayerViolationStrategy(),
  new DependencyCycleStrategy(),
  new DomainLeakageStrategy(),
  new SrpViolationStrategy(),
];

export interface PipelineResult {
  readonly actions: readonly FixAction[];
  readonly warnings: readonly string[];
}

export function selectActions(violations: readonly FixableViolation[]): PipelineResult {
  const actions: FixAction[] = [];
  const warnings: string[] = [];

  for (const violation of violations) {
    const strategy = strategies.find(s => s.supports(violation));
    if (strategy) {
      actions.push(...strategy.buildActions(violation));
    } else {
      warnings.push(`No strategy found for violation kind: ${violation.kind}`);
    }
  }

  const sorted = [...actions].sort((a, b) => a.priority - b.priority);

  return Object.freeze({
    actions: Object.freeze(sorted),
    warnings: Object.freeze(warnings),
  });
}

export function transformActions(actions: readonly FixAction[]): readonly FixAction[] {
  return Object.freeze([...actions]);
}
