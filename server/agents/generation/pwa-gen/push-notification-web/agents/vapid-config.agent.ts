import type { VapidConfig } from "../types.js";

export interface VapidValidationResult {
  readonly valid: boolean;
  readonly log: string;
  readonly error?: string;
}

function hasMinimumLength(value: string, min = 16): boolean {
  return value.trim().length >= min;
}

export function validateVapidConfig(config: VapidConfig): VapidValidationResult {
  const publicValid = hasMinimumLength(config.publicKey);
  const privateValid = hasMinimumLength(config.privateKey);
  const subjectValid = config.subject.startsWith("mailto:") || config.subject.startsWith("https://");

  if (publicValid && privateValid && subjectValid) {
    return {
      valid: true,
      log: "VAPID config validated.",
    };
  }

  return {
    valid: false,
    log: "VAPID config validation failed.",
    error: "Invalid VAPID configuration provided.",
  };
}
