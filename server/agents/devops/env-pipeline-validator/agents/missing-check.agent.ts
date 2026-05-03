import { transitionState } from "../state.js";
import type { AgentResult, EnvSchema, EnvValidatorState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { diffEnvKeys } from "../utils/env-parser.util.js";

const SOURCE = "missing-check";

export interface MissingCheckInput {
  readonly env: Readonly<Record<string, string>>;
  readonly schema: readonly EnvSchema[];
  readonly state: Readonly<EnvValidatorState>;
}

export interface MissingCheckOutput extends AgentResult {
  readonly missing: readonly string[];
}

export function checkMissing(input: MissingCheckInput): Readonly<MissingCheckOutput> {
  const { env, schema, state } = input;

  const requiredKeys = schema.filter((s) => s.required).map((s) => s.key);
  const missing = diffEnvKeys(requiredKeys, env);

  if (missing.length > 0) {
    const descriptions = missing.map((key) => {
      const entry = schema.find((s) => s.key === key);
      return entry?.description ? `${key} (${entry.description})` : key;
    });

    const msg = `${missing.length} required env var(s) are missing: ${descriptions.join(", ")}`;
    const errorLog = buildError(SOURCE, msg);

    return {
      nextState: transitionState(state, {
        missing: Object.freeze(missing),
        appendError: errorLog,
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({
        success: false,
        missing: Object.freeze(missing),
        invalid: Object.freeze([]),
        warnings: Object.freeze([]),
        logs: Object.freeze([buildLog(SOURCE, msg)]),
        error: "missing_required_vars",
      }),
      missing: Object.freeze(missing),
    };
  }

  const log = buildLog(SOURCE, `All ${requiredKeys.length} required var(s) present`);

  return {
    nextState: transitionState(state, { missing: Object.freeze([]), appendLog: log }),
    output: Object.freeze({
      success: true,
      missing: Object.freeze([]),
      invalid: Object.freeze([]),
      warnings: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
    missing: Object.freeze([]),
  };
}
