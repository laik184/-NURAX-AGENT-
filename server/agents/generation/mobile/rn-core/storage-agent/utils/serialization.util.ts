export function safeStringify(value: unknown): string {
  if (value === undefined) {
    return "__undefined__";
  }

  if (value === null) {
    return "null";
  }

  return JSON.stringify(value);
}

export function safeParse(serialized: string): unknown {
  if (serialized === "__undefined__") {
    return undefined;
  }

  if (serialized === "null") {
    return null;
  }

  return JSON.parse(serialized);
}
