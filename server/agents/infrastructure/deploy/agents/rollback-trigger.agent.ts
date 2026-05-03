import { buildRollbackPlan } from "../../../../governance/rollback/index.js";
import type { DeploymentConfig, RollbackResult } from "../types.js";
import { formatLog } from "../utils/log-formatter.util.js";

export function triggerRollback(config: DeploymentConfig, reason: string): RollbackResult {
  if (!config.rollbackSnapshotFrom || !config.rollbackSnapshotTo) {
    return Object.freeze({
      success: false,
      logs: Object.freeze([
        formatLog("rollback-trigger", "Rollback skipped because snapshot references are missing"),
      ]),
      error: `Rollback unavailable: ${reason}`,
    });
  }

  const plan = buildRollbackPlan({
    requestId: `${config.deploymentId}-rollback`,
    fromSnapshotId: config.rollbackSnapshotFrom,
    toSnapshotId: config.rollbackSnapshotTo,
    requestedBy: config.requestedBy ?? "deployment-agent",
    requestedAt: Date.now(),
    trigger: "AUTOMATED",
  });

  if (!plan.ok || !plan.data) {
    return Object.freeze({
      success: false,
      logs: Object.freeze([formatLog("rollback-trigger", "Rollback plan creation failed")]),
      error: plan.error ?? reason,
    });
  }

  return Object.freeze({
    success: true,
    logs: Object.freeze([
      formatLog("rollback-trigger", "Rollback plan created after deployment failure"),
    ]),
    rollbackId: plan.data.planId,
  });
}
