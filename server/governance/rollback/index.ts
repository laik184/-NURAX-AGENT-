export interface RollbackPlanData {
  readonly planId: string;
  readonly fromSnapshotId: string;
  readonly toSnapshotId: string;
  readonly steps: readonly string[];
}

export interface RollbackPlanResult {
  readonly ok: boolean;
  readonly data?: RollbackPlanData;
  readonly error?: string;
}

export interface RollbackPlanInput {
  readonly requestId: string;
  readonly fromSnapshotId: string;
  readonly toSnapshotId: string;
  readonly requestedBy: string;
  readonly requestedAt: number;
  readonly trigger: string;
}

export function buildRollbackPlan(input: RollbackPlanInput): RollbackPlanResult {
  return Object.freeze({
    ok: true,
    data: Object.freeze({
      planId: `rollback-${input.requestId}`,
      fromSnapshotId: input.fromSnapshotId,
      toSnapshotId: input.toSnapshotId,
      steps: Object.freeze(['stop-deployment', 'restore-snapshot', 'verify-health']),
    }),
  });
}
