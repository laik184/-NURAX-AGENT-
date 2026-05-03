export function parseEnvVars(input: Record<string, unknown>): Readonly<Record<string, string>> {
  const parsed = Object.entries(input).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }

    return acc;
  }, {});

  return Object.freeze(parsed);
}
