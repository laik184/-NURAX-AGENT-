const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array => {
  const normalized = hex.trim();
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = parseInt(normalized.substring(i, i + 2), 16);
  }
  return out;
};

const getSubtle = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto subtle API is unavailable in runtime.');
  }

  return globalThis.crypto.subtle;
};

const deriveAesKey = async (secret: string): Promise<CryptoKey> => {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('biometric-auth-agent-salt-v1'),
      iterations: 120000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const hashText = async (value: string): Promise<string> => {
  const subtle = getSubtle();
  const digest = await subtle.digest('SHA-256', encoder.encode(value));
  return toHex(new Uint8Array(digest));
};

export const encryptAes = async (plainText: string, secret: string): Promise<string> => {
  const subtle = getSubtle();
  const key = await deriveAesKey(secret);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText));
  return `${toHex(iv)}:${toHex(new Uint8Array(cipherBuffer))}`;
};

export const decryptAes = async (payload: string, secret: string): Promise<string> => {
  const subtle = getSubtle();
  const parts = payload.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format.');
  }

  const iv = fromHex(parts[0]);
  const cipherBytes = fromHex(parts[1]);
  const key = await deriveAesKey(secret);
  const plainBuffer = await subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return decoder.decode(plainBuffer);
};
