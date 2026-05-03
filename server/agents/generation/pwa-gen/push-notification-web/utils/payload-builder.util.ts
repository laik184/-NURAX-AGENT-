import type { NotificationPayload, PushContext } from "../types.js";

function applyTemplate(template: string, context: PushContext): string {
  return template
    .replaceAll("{userName}", context.userName ?? "there")
    .replaceAll("{event}", context.event);
}

export function buildNotificationPayload(context: PushContext): NotificationPayload {
  return {
    title: applyTemplate(context.titleTemplate, context),
    body: applyTemplate(context.bodyTemplate, context),
    icon: context.icon,
    badge: context.badge,
    actions: context.actions ?? [],
    data: {
      url: context.targetUrl,
      event: context.event,
      userId: context.userId,
      userName: context.userName,
      sentAtIso: context.nowIso,
    },
  };
}
