export function parseEnvString(raw: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return Object.freeze(result);
}

export function mergeEnvSources(
  ...sources: ReadonlyArray<Readonly<Record<string, string>>>
): Readonly<Record<string, string>> {
  const merged: Record<string, string> = {};
  for (const source of sources) {
    for (const [k, v] of Object.entries(source)) {
      merged[k] = v;
    }
  }
  return Object.freeze(merged);
}

export function filterEnvByPrefix(
  env: Readonly<Record<string, string>>,
  prefix: string,
): Readonly<Record<string, string>> {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith(prefix)) {
      filtered[k] = v;
    }
  }
  return Object.freeze(filtered);
}

export function loadProcessEnv(): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) result[k] = v;
  }
  return Object.freeze(result);
}

export function diffEnvKeys(
  required: readonly string[],
  actual: Readonly<Record<string, string>>,
): readonly string[] {
  return Object.freeze(required.filter((key) => !(key in actual) || actual[key] === ""));
}
