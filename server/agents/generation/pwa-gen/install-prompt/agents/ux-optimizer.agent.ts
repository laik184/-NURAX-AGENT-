import { detectDevice } from "../utils/device-detect.util.js";
import { evaluatePromptThrottle } from "../utils/throttle.util.js";

export interface UxOptimizerOutput {
  readonly allowPrompt: boolean;
  readonly recommendedDelayMs: number;
  readonly reason: string;
  readonly logs: readonly string[];
}

export function optimizeInstallUxAgent(input: {
  readonly now: number;
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
  readonly visitCount: number;
  readonly dismissedCount: number;
  readonly lastShownAt: number | null;
}): UxOptimizerOutput {
  const device = detectDevice(input);
  const throttle = evaluatePromptThrottle({
    now: input.now,
    lastShownAt: input.lastShownAt,
    dismissedCount: input.dismissedCount,
    baseCooldownMs: 1000 * 60 * 60 * 12,
  });

  const isReturningUser = input.visitCount > 1;
  const allowPrompt = throttle.allowed && (isReturningUser || device.type === "android");
  const recommendedDelayMs = isReturningUser ? 3500 : 8000;

  return Object.freeze({
    allowPrompt,
    recommendedDelayMs,
    reason: allowPrompt ? "eligible" : `blocked:${throttle.reason}`,
    logs: Object.freeze([
      `ux-optimizer: device=${device.type} returning=${String(isReturningUser)} allowPrompt=${String(allowPrompt)}`,
    ]),
  });
}
