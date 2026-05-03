export function parseJson<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

export function serializeJson(payload: unknown): string {
  return JSON.stringify(payload);
}
