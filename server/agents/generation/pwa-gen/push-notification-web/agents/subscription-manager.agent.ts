import type { SubscriptionData } from "../types.js";

export interface SubscriptionManagerInput {
  readonly existingSubscription?: SubscriptionData;
  readonly userId: string;
}

export interface SubscriptionManagerResult {
  readonly status: "created" | "existing";
  readonly subscription: SubscriptionData;
  readonly log: string;
}

function createDeterministicSubscription(userId: string): SubscriptionData {
  return {
    endpoint: `https://push.service.local/subscriptions/${encodeURIComponent(userId)}`,
    keys: {
      p256dh: `p256dh-${userId}`,
      auth: `auth-${userId}`,
    },
  };
}

export function ensureSubscription(input: SubscriptionManagerInput): SubscriptionManagerResult {
  if (input.existingSubscription) {
    return {
      status: "existing",
      subscription: input.existingSubscription,
      log: "Existing subscription reused.",
    };
  }

  const created = createDeterministicSubscription(input.userId);
  return {
    status: "created",
    subscription: created,
    log: "New subscription created.",
  };
}
