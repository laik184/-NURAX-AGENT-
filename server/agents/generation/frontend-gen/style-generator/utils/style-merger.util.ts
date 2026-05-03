function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeStyleObjects<T extends Record<string, unknown>>(
  ...objects: readonly T[]
): T {
  const merged: Record<string, unknown> = {};

  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      const existing = merged[key];
      if (isObject(existing) && isObject(value)) {
        merged[key] = mergeStyleObjects(existing, value);
      } else {
        merged[key] = value;
      }
    }
  }

  return merged as T;
}
