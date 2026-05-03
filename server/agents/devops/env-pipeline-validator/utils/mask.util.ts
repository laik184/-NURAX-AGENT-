const VISIBLE_PREFIX_LEN = 4;
const MASK_CHAR = "*";

export function maskValue(value: string): string {
  if (!value || value.length === 0) return "";
  if (value.length <= VISIBLE_PREFIX_LEN) return MASK_CHAR.repeat(value.length);
  const prefix = value.slice(0, VISIBLE_PREFIX_LEN);
  const masked = MASK_CHAR.repeat(Math.min(value.length - VISIBLE_PREFIX_LEN, 12));
  return `${prefix}${masked}`;
}

export function maskEnvRecord(
  env: Readonly<Record<string, string>>,
  secretKeys: readonly string[],
): Readonly<Record<string, string>> {
  const secretSet = new Set(secretKeys.map((k) => k.toUpperCase()));
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    masked[k] = secretSet.has(k.toUpperCase()) ? maskValue(v) : v;
  }
  return Object.freeze(masked);
}

export function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return (
    upper.includes("SECRET") ||
    upper.includes("PASSWORD") ||
    upper.includes("PASSWD") ||
    upper.includes("TOKEN") ||
    upper.includes("API_KEY") ||
    upper.includes("PRIVATE") ||
    upper.includes("CREDENTIAL") ||
    upper.includes("AUTH") ||
    upper.includes("DSN") ||
    upper.includes("CONNECTION_STRING")
  );
}
