export interface RollbackPlanConfig {
  readonly requestId: string;
  readonly fromSnapshotId: string;
  readonly toSnapshotId: string;
  readonly requestedBy: string;
  readonly requestedAt: number;
  readonly trigger: "AUTOMATED" | "MANUAL";
}

export interface RollbackPlan {
  readonly planId: string;
  readonly steps: readonly string[];
  readonly canRollback: boolean;
  readonly reason: string;
}

export interface RollbackPlanResult {
  readonly ok: boolean;
  readonly data?: RollbackPlan;
  readonly error?: string;
}

export function buildRollbackPlan(config: RollbackPlanConfig): RollbackPlanResult {
  if (!config.fromSnapshotId || !config.toSnapshotId) {
    return Object.freeze({
      ok: false,
      error: "Rollback requires both fromSnapshotId and toSnapshotId.",
    });
  }

  const plan: RollbackPlan = Object.freeze({
    planId: `rollback-${config.requestId}`,
    steps: Object.freeze([
      `Stop deployment ${config.fromSnapshotId}`,
      `Restore snapshot ${config.toSnapshotId}`,
      "Verify restored service health",
    ]),
    canRollback: true,
    reason: `Triggered by ${config.trigger} at ${new Date(config.requestedAt).toISOString()}`,
  });

  return Object.freeze({ ok: true, data: plan });
}
