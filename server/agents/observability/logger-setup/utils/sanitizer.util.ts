const SENSITIVE_KEYS: readonly string[] = Object.freeze([
  "password",
  "token",
  "secret",
  "authorization",
  "apikey",
  "api_key",
  "creditcard",
  "credit_card",
  "ssn",
  "private_key",
  "privatekey",
  "access_token",
  "refresh_token",
]);

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((k) => lower.includes(k));
}

export function sanitizeMeta(
  meta: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (isSensitive(key)) {
      result[key] = "[REDACTED]";
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = sanitizeMeta(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return Object.freeze(result);
}

export function isSensitiveKey(key: string): boolean {
  return isSensitive(key);
}
