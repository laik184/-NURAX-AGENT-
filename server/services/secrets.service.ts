import { fileSystemService } from "./filesystem.service.js";

const REDACTION_MASK = "***REDACTED***" as const;

const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = Object.freeze([
  /SECRET/i,
  /TOKEN/i,
  /PASSWORD/i,
  /PASSWD/i,
  /API_?KEY/i,
  /PRIVATE_?KEY/i,
  /CLIENT_?SECRET/i,
  /AUTH/i,
  /CREDENTIAL/i,
  /SESSION/i,
  /COOKIE/i,
  /SIGNING/i,
  /ENCRYPT/i,
  /DATABASE_URL/i,
  /CONNECTION_STRING/i,
]);

export interface RedactedEnv {
  readonly keys: readonly string[];
  readonly redacted: Readonly<Record<string, string>>;
  readonly sensitiveKeys: readonly string[];
}

const isSensitive = (key: string): boolean =>
  SENSITIVE_KEY_PATTERNS.some((rx) => rx.test(key));

const parseEnvLines = (raw: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

export interface SecretsService {
  readEnvFileRedacted(filePath: string): Promise<RedactedEnv>;
  redactRecord(record: Readonly<Record<string, string>>): RedactedEnv;
  isSensitiveKey(key: string): boolean;
  list(): RedactedEnv;
}

export const secretsService: SecretsService = Object.freeze({
  async readEnvFileRedacted(filePath: string): Promise<RedactedEnv> {
    let raw = "";
    try {
      raw = await fileSystemService.readFile(filePath, "utf8");
    } catch {
      return Object.freeze({
        keys: Object.freeze([]),
        redacted: Object.freeze({}),
        sensitiveKeys: Object.freeze([]),
      });
    }
    const parsed = parseEnvLines(raw);
    return secretsService.redactRecord(parsed);
  },

  redactRecord(record: Readonly<Record<string, string>>): RedactedEnv {
    const keys = Object.keys(record);
    const redacted: Record<string, string> = {};
    const sensitive: string[] = [];
    for (const key of keys) {
      if (isSensitive(key)) {
        redacted[key] = REDACTION_MASK;
        sensitive.push(key);
      } else {
        redacted[key] = record[key];
      }
    }
    return Object.freeze({
      keys: Object.freeze([...keys]),
      redacted: Object.freeze(redacted),
      sensitiveKeys: Object.freeze(sensitive),
    });
  },

  isSensitiveKey(key: string): boolean {
    return isSensitive(key);
  },

  list(): RedactedEnv {
    return Object.freeze({
      keys: Object.freeze([] as string[]),
      redacted: Object.freeze({} as Record<string, string>),
      sensitiveKeys: Object.freeze([] as string[]),
    });
  },
});
