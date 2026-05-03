import type { DeliveryTriggerDecision } from "../types.js";
import { isWithinDeliveryWindow, nextAllowedWindowIso } from "../utils/time-window.util.js";

export interface DeliveryTriggerInput {
  readonly event: string;
  readonly nowIso: string;
  readonly reminderAtIso?: string;
}

const EVENT_ALLOWLIST = new Set(["signup", "order", "reminder", "cart_abandon"]);

export function decideDelivery(input: DeliveryTriggerInput): DeliveryTriggerDecision {
  if (!EVENT_ALLOWLIST.has(input.event)) {
    return {
      shouldSend: false,
      reason: `Unsupported event: ${input.event}`,
    };
  }

  if (input.event === "reminder" && input.reminderAtIso) {
    const shouldSendReminder = new Date(input.nowIso).getTime() >= new Date(input.reminderAtIso).getTime();
    return {
      shouldSend: shouldSendReminder,
      reason: shouldSendReminder ? "Reminder window reached." : "Reminder not yet due.",
      scheduledAtIso: shouldSendReminder ? input.nowIso : input.reminderAtIso,
    };
  }

  if (isWithinDeliveryWindow(input.nowIso)) {
    return {
      shouldSend: true,
      reason: "Event eligible and within delivery window.",
      scheduledAtIso: input.nowIso,
    };
  }

  return {
    shouldSend: false,
    reason: "Outside delivery window; rescheduled.",
    scheduledAtIso: nextAllowedWindowIso(input.nowIso),
  };
}
