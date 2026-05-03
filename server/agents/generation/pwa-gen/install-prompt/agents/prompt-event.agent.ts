import { normalizeInstallPromptEvent } from "../utils/event.util.js";

export interface PromptEventAgentOutput {
  readonly deferredPrompt: Readonly<{ id: string; canPrompt: boolean }> | null;
  readonly logs: readonly string[];
}

export function capturePromptEventAgent(input: {
  readonly rawEvent: { readonly id?: string; readonly prompt?: unknown } | null;
}): PromptEventAgentOutput {
  const normalized = normalizeInstallPromptEvent(input.rawEvent);

  if (!normalized) {
    return Object.freeze({
      deferredPrompt: null,
      logs: Object.freeze(["prompt-event: no beforeinstallprompt event captured"]),
    });
  }

  return Object.freeze({
    deferredPrompt: normalized,
    logs: Object.freeze([`prompt-event: deferred event stored (${normalized.id})`]),
  });
}
