import { evaluatePromptThrottle } from "../utils/throttle.util.js";

export interface InstallTriggerOutput {
  readonly shouldPrompt: boolean;
  readonly reason: string;
  readonly logs: readonly string[];
}

export function executeInstallTriggerAgent(input: {
  readonly now: number;
  readonly lastShownAt: number | null;
  readonly dismissedCount: number;
  readonly hasDeferredPrompt: boolean;
  readonly hasInstallClick: boolean;
  readonly scrollDepthPercent: number;
  readonly isExitIntent: boolean;
}): InstallTriggerOutput {
  const throttle = evaluatePromptThrottle({
    now: input.now,
    lastShownAt: input.lastShownAt,
    dismissedCount: input.dismissedCount,
    baseCooldownMs: 1000 * 60 * 60 * 24,
  });

  const hasIntentSignal = input.hasInstallClick || input.scrollDepthPercent >= 65 || input.isExitIntent;
  const shouldPrompt = input.hasDeferredPrompt && hasIntentSignal && throttle.allowed;

  return Object.freeze({
    shouldPrompt,
    reason: shouldPrompt ? "prompt-triggered" : `${throttle.reason}|intent=${String(hasIntentSignal)}`,
    logs: Object.freeze([
      `install-trigger: intent=${String(hasIntentSignal)} throttle=${throttle.reason} shouldPrompt=${String(shouldPrompt)}`,
    ]),
  });
}
