export function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    throw new Error(`Failed to serialize value: ${String(value)}`);
  }
}

export function deserialize<T = unknown>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export function serializeSession(data: object): string {
  return serialize(data);
}

export function deserializeSession<T extends object>(raw: string): T {
  return deserialize<T>(raw);
}

export function serializeMessage(payload: unknown): string {
  return serialize({ payload, ts: Date.now() });
}

export function deserializeMessage<T = unknown>(raw: string): { payload: T; ts: number } {
  return deserialize<{ payload: T; ts: number }>(raw);
}

export function isSafeToSerialize(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}
