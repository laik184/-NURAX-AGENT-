export type StorageSnapshot = Readonly<Record<string, string>>;

export interface StorageWriteResult {
  readonly snapshot: StorageSnapshot;
  readonly didWrite: boolean;
}

export function readStorage(snapshot: StorageSnapshot, key: string): string | null {
  const value = snapshot[key];
  return typeof value === "string" ? value : null;
}

export function writeStorage(snapshot: StorageSnapshot, key: string, value: string): StorageWriteResult {
  const next = Object.freeze({ ...snapshot, [key]: value });
  return Object.freeze({ snapshot: next, didWrite: true });
}
