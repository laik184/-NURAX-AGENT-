export interface RollbackPlan {
  readonly steps: readonly string[];
  readonly canRollback: boolean;
  readonly reason: string;
}

export function buildRollbackPlan(config: unknown, reason: string): RollbackPlan {
  return Object.freeze({
    steps: Object.freeze(['stop-deployment', 'restore-previous-version']),
    canRollback: true,
    reason,
  });
}
