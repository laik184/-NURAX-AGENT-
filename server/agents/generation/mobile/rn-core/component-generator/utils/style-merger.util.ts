function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeStyles(
  baseStyle: Readonly<Record<string, unknown>>,
  overrideStyle: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (!isRecord(baseStyle) && !isRecord(overrideStyle)) {
    return Object.freeze({});
  }

  if (!isRecord(baseStyle)) {
    return Object.freeze({ ...overrideStyle });
  }

  if (!isRecord(overrideStyle)) {
    return Object.freeze({ ...baseStyle });
  }

  return Object.freeze({
    ...baseStyle,
    ...overrideStyle,
  });
}
