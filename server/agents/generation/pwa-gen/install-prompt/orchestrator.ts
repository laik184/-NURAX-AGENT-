import { buildInstallButtonAgent } from "./agents/install-button.agent.js";
import { executeInstallTriggerAgent } from "./agents/install-trigger.agent.js";
import { trackInstallResultAgent } from "./agents/install-tracker.agent.js";
import { capturePromptEventAgent } from "./agents/prompt-event.agent.js";
import { optimizeInstallUxAgent } from "./agents/ux-optimizer.agent.js";
import {
  createInitialState,
  withDeferredPrompt,
  withDeviceType,
  withInstallAccepted,
  withInstallDismissed,
  withPromptShown,
} from "./state.js";
import type { InstallEnvironment, InstallResult } from "./types.js";
import { detectDevice } from "./utils/device-detect.util.js";
import { readStorage, type StorageSnapshot } from "./utils/storage.util.js";

function parseMetrics(storage: StorageSnapshot): { impressions: number; accepted: number } {
  const raw = readStorage(storage, "pwa.install.metrics");
  if (!raw) {
    return Object.freeze({ impressions: 0, accepted: 0 });
  }

  try {
    const parsed = JSON.parse(raw) as { impressions?: number; accepted?: number };
    const impressions = typeof parsed.impressions === "number" ? parsed.impressions : 0;
    const accepted = typeof parsed.accepted === "number" ? parsed.accepted : 0;
    return Object.freeze({ impressions, accepted });
  } catch {
    return Object.freeze({ impressions: 0, accepted: 0 });
  }
}

export function runInstallPromptOrchestrator(input: {
  readonly environment: InstallEnvironment;
  readonly rawEvent: { readonly id?: string; readonly prompt?: unknown } | null;
  readonly installOutcome: "accepted" | "dismissed" | "ignored";
  readonly storage: StorageSnapshot;
}): InstallResult {
  const logs: string[] = [];
  let state = createInitialState();

  try {
    const device = detectDevice(input.environment);
    state = withDeviceType(state, device.type);
    logs.push(`orchestrator: device detected (${device.type})`);

    const promptEvent = capturePromptEventAgent({ rawEvent: input.rawEvent });
    logs.push(...promptEvent.logs);
    state = withDeferredPrompt(state, promptEvent.deferredPrompt);

    const ux = optimizeInstallUxAgent({
      now: input.environment.now,
      userAgent: input.environment.userAgent,
      platform: input.environment.platform,
      maxTouchPoints: input.environment.maxTouchPoints,
      visitCount: input.environment.visitCount,
      dismissedCount: state.dismissedCount,
      lastShownAt: state.lastShownAt,
    });
    logs.push(...ux.logs);

    const button = buildInstallButtonAgent({
      userAgent: input.environment.userAgent,
      platform: input.environment.platform,
      maxTouchPoints: input.environment.maxTouchPoints,
      hasDeferredPrompt: Boolean(state.deferredPrompt),
      isInstalled: state.isInstalled || input.environment.isStandalone,
    });
    logs.push(...button.logs);

    const trigger = executeInstallTriggerAgent({
      now: input.environment.now + ux.recommendedDelayMs,
      lastShownAt: state.lastShownAt,
      dismissedCount: state.dismissedCount,
      hasDeferredPrompt: button.button.visible && ux.allowPrompt,
      hasInstallClick: input.environment.hasInstallClick,
      scrollDepthPercent: input.environment.scrollDepthPercent,
      isExitIntent: input.environment.isExitIntent,
    });
    logs.push(...trigger.logs);

    if (trigger.shouldPrompt) {
      state = withPromptShown(state, input.environment.now + ux.recommendedDelayMs);
      logs.push("orchestrator: prompt.show() simulated");
    }

    const metrics = parseMetrics(input.storage);
    const tracker = trackInstallResultAgent({
      outcome: trigger.shouldPrompt ? input.installOutcome : "ignored",
      impressions: metrics.impressions,
      acceptedTotal: metrics.accepted,
      storage: input.storage,
    });
    logs.push(...tracker.logs);

    if (tracker.accepted) {
      state = withInstallAccepted(state);
    }

    if (tracker.dismissed) {
      state = withInstallDismissed(state);
    }

    logs.push(`orchestrator: flow complete for ${state.deviceType}`);

    return Object.freeze({
      success: true,
      logs: Object.freeze([...logs]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown install-prompt orchestrator error";
    return Object.freeze({
      success: false,
      logs: Object.freeze([...logs, `orchestrator-error: ${message}`]),
      error: message,
    });
  }
}
