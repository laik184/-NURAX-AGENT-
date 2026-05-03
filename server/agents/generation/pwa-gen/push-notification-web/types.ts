export type PermissionStatus = "granted" | "denied" | "default" | "unsupported";

export interface NotificationAction {
  readonly action: string;
  readonly title: string;
  readonly icon?: string;
}

export interface NotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly icon?: string;
  readonly badge?: string;
  readonly actions: readonly NotificationAction[];
  readonly data: Readonly<{
    url: string;
    event: string;
    userId: string;
    userName?: string;
    sentAtIso: string;
  }>;
}

export interface SubscriptionData {
  readonly endpoint: string;
  readonly keys: Readonly<{
    p256dh: string;
    auth: string;
  }>;
}

export interface VapidConfig {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
}

export interface DeliveryTriggerDecision {
  readonly shouldSend: boolean;
  readonly reason: string;
  readonly scheduledAtIso?: string;
}

export interface EngagementMetrics {
  readonly delivered: number;
  readonly opened: number;
  readonly clicked: number;
}

export interface EngagementReport {
  readonly openRate: number;
  readonly clickRate: number;
  readonly deliveryLogs: readonly string[];
  readonly metrics: EngagementMetrics;
}

export interface PushContext {
  readonly userId: string;
  readonly userName?: string;
  readonly event: string;
  readonly nowIso: string;
  readonly targetUrl: string;
  readonly titleTemplate: string;
  readonly bodyTemplate: string;
  readonly icon?: string;
  readonly badge?: string;
  readonly actions?: readonly NotificationAction[];
  readonly reminderAtIso?: string;
}

export interface PushRequest {
  readonly context: PushContext;
  readonly browserSupportsPush: boolean;
  readonly permissionStatus: "granted" | "denied" | "default";
  readonly existingSubscription?: SubscriptionData;
  readonly vapidConfig: VapidConfig;
}

export interface PushStateSnapshot {
  readonly permissionStatus: PermissionStatus;
  readonly subscriptionStatus: "none" | "created" | "existing";
  readonly lastNotificationSent?: string;
  readonly engagementMetrics: EngagementMetrics;
}

export interface PushResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}
