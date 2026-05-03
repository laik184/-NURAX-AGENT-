export interface NormalizedInstallEvent {
  readonly id: string;
  readonly canPrompt: boolean;
}

export function normalizeInstallPromptEvent(rawEvent: {
  readonly id?: string;
  readonly prompt?: unknown;
} | null): NormalizedInstallEvent | null {
  if (!rawEvent || typeof rawEvent !== "object") {
    return null;
  }

  const id = typeof rawEvent.id === "string" && rawEvent.id.trim().length > 0
    ? rawEvent.id
    : "beforeinstallprompt";

  const canPrompt = typeof rawEvent.prompt === "function";

  return Object.freeze({ id, canPrompt });
}
