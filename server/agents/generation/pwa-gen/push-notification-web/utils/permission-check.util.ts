import type { PermissionStatus } from "../types.js";

const SUPPORTED_STATUSES = new Set<PermissionStatus>(["granted", "denied", "default", "unsupported"]);

export function normalizePermissionStatus(
  status: string,
  supportsNotifications: boolean,
): PermissionStatus {
  if (!supportsNotifications) {
    return "unsupported";
  }

  if (SUPPORTED_STATUSES.has(status as PermissionStatus)) {
    return status as PermissionStatus;
  }

  return "default";
}

export function isPermissionGranted(status: PermissionStatus): boolean {
  return status === "granted";
}
