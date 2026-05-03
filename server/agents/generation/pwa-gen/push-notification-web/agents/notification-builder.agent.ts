import type { NotificationPayload, PushContext } from "../types.js";
import { buildNotificationPayload } from "../utils/payload-builder.util.js";

export interface NotificationBuilderResult {
  readonly payload: NotificationPayload;
  readonly log: string;
}

export function buildNotification(context: PushContext): NotificationBuilderResult {
  return {
    payload: buildNotificationPayload(context),
    log: "Notification payload built.",
  };
}
