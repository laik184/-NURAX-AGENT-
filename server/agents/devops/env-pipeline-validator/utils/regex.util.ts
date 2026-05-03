export const PATTERNS = Object.freeze({
  url: /^https?:\/\/([\w-]+(\.[\w-]+)+)(:\d{1,5})?(\/[^\s]*)?$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  port: /^([1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
  token: /^[A-Za-z0-9\-_.~+/]+=*$/,
  semver: /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  hexKey: /^[0-9a-fA-F]+$/,
  base64: /^[A-Za-z0-9+/]+=*$/,
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  nonEmpty: /\S/,
});

export const WEAK_SECRET_PATTERNS: readonly RegExp[] = Object.freeze([
  /^(.)\1+$/,
  /^(password|secret|test|example|changeme|dummy|placeholder|your[-_]?\w+here)$/i,
  /^(123456|qwerty|abcdef|000000)$/i,
]);

export const EXPOSED_SECRET_PATTERNS: readonly { label: string; pattern: RegExp }[] = Object.freeze([
  { label: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { label: "GitHub Token", pattern: /ghp_[A-Za-z0-9]{36}/ },
  { label: "Stripe Secret Key", pattern: /sk_(live|test)_[A-Za-z0-9]{24,}/ },
  { label: "Slack Token", pattern: /xox[baprs]-[A-Za-z0-9-]+/ },
  { label: "Private Key PEM", pattern: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { label: "Generic High-Entropy Secret", pattern: /[A-Za-z0-9/+]{40,}={0,2}/ },
]);

export function testPattern(value: string, patternKey: keyof typeof PATTERNS): boolean {
  return PATTERNS[patternKey].test(value);
}

export function isWeakSecret(value: string): boolean {
  if (value.length < 8) return true;
  return WEAK_SECRET_PATTERNS.some((p) => p.test(value));
}

export function detectExposedSecretType(value: string): string | null {
  for (const { label, pattern } of EXPOSED_SECRET_PATTERNS) {
    if (label === "Generic High-Entropy Secret") continue;
    if (pattern.test(value)) return label;
  }
  return null;
}
