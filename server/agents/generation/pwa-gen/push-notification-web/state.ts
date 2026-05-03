import type { PushStateSnapshot } from "./types.js";

export const INITIAL_STATE: Readonly<PushStateSnapshot> = Object.freeze({
  permissionStatus: "default",
  subscriptionStatus: "none",
  engagementMetrics: Object.freeze({
    delivered: 0,
    opened: 0,
    clicked: 0,
  }),
});

export function mergeState(
  current: Readonly<PushStateSnapshot>,
  patch: Partial<PushStateSnapshot>,
): Readonly<PushStateSnapshot> {
  return Object.freeze({
    ...current,
    ...patch,
    engagementMetrics: Object.freeze({
      ...(patch.engagementMetrics ?? current.engagementMetrics),
    }),
  });
}
