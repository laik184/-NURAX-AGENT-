import { requestPermission } from "./agents/permission-requester.agent.js";
import { ensureSubscription } from "./agents/subscription-manager.agent.js";
import { validateVapidConfig } from "./agents/vapid-config.agent.js";
import { buildNotification } from "./agents/notification-builder.agent.js";
import { decideDelivery } from "./agents/delivery-trigger.agent.js";
import { attachClickHandler } from "./agents/click-handler.agent.js";
import { trackEngagement } from "./agents/engagement-tracker.agent.js";
import { INITIAL_STATE, mergeState } from "./state.js";
import type { PushRequest, PushResult } from "./types.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";

export function runPushNotificationModule(request: PushRequest): PushResult {
  const logs: string[] = [];
  let state = INITIAL_STATE;

  const permission = requestPermission({
    browserSupportsPush: request.browserSupportsPush,
    permissionStatus: request.permissionStatus,
  });
  logs.push(permission.log);
  state = mergeState(state, { permissionStatus: permission.permissionStatus });

  const subscription = ensureSubscription({
    existingSubscription: request.existingSubscription,
    userId: request.context.userId,
  });
  logs.push(subscription.log);
  state = mergeState(state, { subscriptionStatus: subscription.status });

  const vapid = validateVapidConfig(request.vapidConfig);
  logs.push(vapid.log);

  const notification = buildNotification(request.context);
  logs.push(notification.log);

  const delivery = decideDelivery({
    event: request.context.event,
    nowIso: request.context.nowIso,
    reminderAtIso: request.context.reminderAtIso,
  });
  logs.push(`Delivery decision: ${delivery.reason}`);

  const click = attachClickHandler(notification.payload);
  logs.push(click.log);

  const engagement = trackEngagement({
    currentMetrics: state.engagementMetrics,
    delivered: delivery.shouldSend,
    opened: false,
    clicked: false,
    nowIso: request.context.nowIso,
  });
  logs.push(...engagement.deliveryLogs);
  state = mergeState(state, {
    engagementMetrics: engagement.metrics,
    lastNotificationSent: delivery.shouldSend ? request.context.nowIso : state.lastNotificationSent,
  });

  if (!vapid.valid) {
    return deepFreeze({
      success: false,
      logs,
      error: vapid.error ?? "VAPID validation failed.",
    });
  }

  if (state.permissionStatus !== "granted") {
    return deepFreeze({
      success: false,
      logs,
      error: "Permission denied or unavailable.",
    });
  }

  return deepFreeze({
    success: true,
    logs,
  });
}
