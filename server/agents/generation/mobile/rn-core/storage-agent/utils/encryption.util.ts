const ENCRYPTION_PREFIX = "enc:";

export function encryptValue(value: string): string {
  const transformed = value
    .split("")
    .reverse()
    .map((char, index) => String.fromCharCode(char.charCodeAt(0) + ((index % 7) + 1)))
    .join("");

  return `${ENCRYPTION_PREFIX}${transformed}`;
}

export function decryptValue(encrypted: string): string {
  const payload = encrypted.startsWith(ENCRYPTION_PREFIX)
    ? encrypted.slice(ENCRYPTION_PREFIX.length)
    : encrypted;

  return payload
    .split("")
    .map((char, index) => String.fromCharCode(char.charCodeAt(0) - ((index % 7) + 1)))
    .reverse()
    .join("");
}
