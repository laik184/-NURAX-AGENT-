import { transitionState } from "../state.js";
import type { AgentResult, EnvValidatorState } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { loadProcessEnv, mergeEnvSources, parseEnvString } from "../utils/env-parser.util.js";
import { maskEnvRecord, isSensitiveKey } from "../utils/mask.util.js";

const SOURCE = "env-loader";

export interface EnvLoaderInput {
  readonly envString?: string;
  readonly extraEnv?: Readonly<Record<string, string>>;
  readonly includeProcess?: boolean;
  readonly state: Readonly<EnvValidatorState>;
}

export interface EnvLoaderOutput extends AgentResult {
  readonly env: Readonly<Record<string, string>>;
}

export function loadEnv(input: EnvLoaderInput): Readonly<EnvLoaderOutput> {
  const { envString, extraEnv = {}, includeProcess = false, state } = input;

  const sources: Array<Readonly<Record<string, string>>> = [];

  if (includeProcess) {
    sources.push(loadProcessEnv());
  }

  if (envString) {
    const parsed = parseEnvString(envString);
    sources.push(parsed);
  }

  sources.push(extraEnv);

  const merged = mergeEnvSources(...sources);

  const secretKeys = Object.keys(merged).filter(isSensitiveKey);
  const masked = maskEnvRecord(merged, secretKeys);

  const log = buildLog(
    SOURCE,
    `Loaded ${Object.keys(merged).length} env var(s) from ${sources.length} source(s) — ${secretKeys.length} secret(s) masked in logs`,
  );

  return {
    nextState: transitionState(state, { env: merged, appendLog: log }),
    output: Object.freeze({
      success: true,
      missing: Object.freeze([]),
      invalid: Object.freeze([]),
      warnings: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
    env: merged,
  };
}
