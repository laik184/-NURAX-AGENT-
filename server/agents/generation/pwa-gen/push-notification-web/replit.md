# Push Notification Web Module (HVP)

## Module Purpose
A deterministic, HVP-compliant push notification pipeline for PWA/Web that handles permission, subscription lifecycle, VAPID validation, payload construction, delivery timing, click/deep-link handling, and engagement tracking.

## File Responsibilities
- `orchestrator.ts` (L1): coordination-only execution pipeline.
- `types.ts` (L0): contracts for request, payload, state, and result.
- `state.ts` (L0): immutable initial state and state transition helper.
- `agents/*.agent.ts` (L2): each business capability isolated by single responsibility.
- `utils/*.util.ts` (L3): pure helper functions with no orchestration concerns.
- `index.ts`: exports only the orchestrator surface.

## Call Flow
1. `permission-requester.agent.ts` resolves browser support + permission status.
2. `subscription-manager.agent.ts` ensures existing or newly created subscription.
3. `vapid-config.agent.ts` validates VAPID key material and subject.
4. `notification-builder.agent.ts` constructs typed payload.
5. `delivery-trigger.agent.ts` decides event/time eligibility.
6. `click-handler.agent.ts` prepares redirect/deep-link data.
7. `engagement-tracker.agent.ts` updates delivery/open/click metrics.
8. `orchestrator.ts` returns output contract:
   - `{ success: boolean, logs: string[], error?: string }`.

## Import Rules
- No `agent -> agent` imports.
- `orchestrator.ts` coordinates agent calls only.
- Utilities must stay pure and stateless.
- No cross-module deep imports; keep imports local within this module tree.

## Example Usage
```ts
import { runPushNotificationModule } from "./index.js";

const result = runPushNotificationModule({
  browserSupportsPush: true,
  permissionStatus: "granted",
  vapidConfig: {
    publicKey: "public-key-1234567890",
    privateKey: "private-key-1234567890",
    subject: "mailto:ops@example.com",
  },
  context: {
    userId: "u-1",
    userName: "Asha",
    event: "signup",
    nowIso: new Date().toISOString(),
    targetUrl: "/welcome",
    titleTemplate: "Welcome {userName}",
    bodyTemplate: "Your {event} flow is ready",
  },
});
```
