import { transitionState } from "../state.js";
import type { AgentResult, EnvValidatorState, SecretFinding } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { maskValue, isSensitiveKey } from "../utils/mask.util.js";
import { isWeakSecret, detectExposedSecretType } from "../utils/regex.util.js";

const SOURCE = "secret-detector";

export interface SecretDetectorInput {
  readonly env: Readonly<Record<string, string>>;
  readonly state: Readonly<EnvValidatorState>;
}

export interface SecretDetectorOutput extends AgentResult {
  readonly findings: readonly SecretFinding[];
}

export function detectSecrets(input: SecretDetectorInput): Readonly<SecretDetectorOutput> {
  const { env, state } = input;
  const findings: SecretFinding[] = [];
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    const sensitive = isSensitiveKey(key);
    const masked = maskValue(value);

    const exposedType = detectExposedSecretType(value);
    if (exposedType) {
      findings.push(
        Object.freeze({
          key,
          risk: "critical" as const,
          reason: `Value matches known secret pattern: ${exposedType}`,
          maskedValue: masked,
        }),
      );
      continue;
    }

    if (sensitive && isWeakSecret(value)) {
      findings.push(
        Object.freeze({
          key,
          risk: "high" as const,
          reason: "Secret value is weak or uses a placeholder (too short, repeating chars, or dictionary word)",
          maskedValue: masked,
        }),
      );
      continue;
    }

    if (sensitive && value.length < 16) {
      warnings.push(`${key}: sensitive key has a short value (${value.length} chars) — consider a stronger secret`);
    }
  }

  const criticalCount = findings.filter((f) => f.risk === "critical").length;
  const highCount = findings.filter((f) => f.risk === "high").length;

  const log = buildLog(
    SOURCE,
    `Secret scan: ${Object.keys(env).length} var(s) — ${criticalCount} critical, ${highCount} high-risk finding(s), ${warnings.length} warning(s)`,
  );

  const currentWarnings = state.warnings;
  const merged = Object.freeze([...currentWarnings, ...warnings]);

  return {
    nextState: transitionState(state, { warnings: merged, appendLog: log }),
    output: Object.freeze({
      success: criticalCount === 0,
      missing: Object.freeze([]),
      invalid: Object.freeze([]),
      warnings: Object.freeze(warnings),
      logs: Object.freeze([log]),
      ...(criticalCount > 0 ? { error: "critical_secret_exposure" } : {}),
    }),
    findings: Object.freeze(findings),
  };
}
