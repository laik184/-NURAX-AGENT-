/**
 * server/services/index.ts
 *
 * Core infrastructure services shared across agent modules.
 *
 * Services:
 *   fileSystemService  — sandboxed fs helpers (readDir, stat, readFile, writeFile)
 *   secretsService     — env-file reading with secret redaction
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

// ─────────────────────────────────────────────────────────────────────────────
//  FILE SYSTEM SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export interface StatResult {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly size: number;
  readonly mtimeMs: number;
}

export interface FileSystemService {
  /** List entry names (not full paths) inside a directory. */
  readDir(dirPath: string): Promise<readonly string[]>;

  /** Stat a path — returns a typed stat object. */
  stat(filePath: string): Promise<StatResult>;

  /** Read a file as a string (UTF-8 by default). */
  readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;

  /** Write content to a file, creating intermediate directories as needed. */
  writeFile(filePath: string, content: string, encoding?: BufferEncoding): Promise<void>;

  /** Check whether a path exists. */
  exists(filePath: string): boolean;
}

export const fileSystemService: FileSystemService = {
  async readDir(dirPath: string): Promise<readonly string[]> {
    try {
      const entries = await fs.readdir(dirPath);
      return Object.freeze(entries);
    } catch {
      return Object.freeze([]);
    }
  },

  async stat(filePath: string): Promise<StatResult> {
    const s = await fs.stat(filePath);
    return Object.freeze({
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
      size: s.size,
      mtimeMs: s.mtimeMs,
    });
  },

  async readFile(filePath: string, encoding: BufferEncoding = "utf8"): Promise<string> {
    return fs.readFile(filePath, { encoding });
  },

  async writeFile(filePath: string, content: string, encoding: BufferEncoding = "utf8"): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, { encoding });
  },

  exists(filePath: string): boolean {
    return existsSync(filePath);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECRETS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const SECRET_PATTERN = /^(.*(?:KEY|SECRET|TOKEN|PASSWORD|PASS|PWD|AUTH|CREDENTIAL|API|PRIVATE).*)/i;
const REDACT_PLACEHOLDER = "[REDACTED]";

export interface RedactedEnvResult {
  /** All env vars — sensitive values replaced with [REDACTED]. */
  readonly redacted: Record<string, string>;
  /** Keys whose values were redacted. */
  readonly redactedKeys: readonly string[];
}

export interface SecretsService {
  /**
   * Read an env file and return its key-value pairs with secret values
   * replaced by [REDACTED]. Non-existent files return empty maps.
   */
  readEnvFileRedacted(filePath: string): Promise<RedactedEnvResult>;

  /**
   * Read an env file and return raw key-value pairs (unredacted).
   * Use only in server-side contexts — never send to the client.
   */
  readEnvFileRaw(filePath: string): Promise<Record<string, string>>;
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes if present
    const value =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;
    if (key) result[key] = value;
  }
  return result;
}

export const secretsService: SecretsService = {
  async readEnvFileRedacted(filePath: string): Promise<RedactedEnvResult> {
    let content = "";
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      return { redacted: {}, redactedKeys: [] };
    }

    const raw = parseEnvFile(content);
    const redacted: Record<string, string> = {};
    const redactedKeys: string[] = [];

    for (const [key, value] of Object.entries(raw)) {
      if (SECRET_PATTERN.test(key)) {
        redacted[key] = REDACT_PLACEHOLDER;
        redactedKeys.push(key);
      } else {
        redacted[key] = value;
      }
    }

    return Object.freeze({ redacted, redactedKeys: Object.freeze(redactedKeys) });
  },

  async readEnvFileRaw(filePath: string): Promise<Record<string, string>> {
    let content = "";
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      return {};
    }
    return parseEnvFile(content);
  },
};
