import type { PermissionStatus } from "../types.js";
import { normalizePermissionStatus } from "../utils/permission-check.util.js";

export interface PermissionRequesterInput {
  readonly browserSupportsPush: boolean;
  readonly permissionStatus: "granted" | "denied" | "default";
}

export interface PermissionRequesterResult {
  readonly permissionStatus: PermissionStatus;
  readonly log: string;
}

export function requestPermission(input: PermissionRequesterInput): PermissionRequesterResult {
  const normalized = normalizePermissionStatus(input.permissionStatus, input.browserSupportsPush);
  return {
    permissionStatus: normalized,
    log: `Permission status resolved: ${normalized}`,
  };
}
