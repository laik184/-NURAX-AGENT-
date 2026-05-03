import { transitionState } from "../state.js";
import type {
  AgentResult,
  EnvSchema,
  EnvValidatorState,
  PolicyRule,
  ValidationError,
} from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { isSensitiveKey } from "../utils/mask.util.js";

const SOURCE = "policy-enforcer";

const BUILT_IN_POLICIES: readonly PolicyRule[] = Object.freeze([
  Object.freeze({
    id: "no-debug-in-production",
    description: "DEBUG must not be enabled in production (NODE_ENV=production)",
    severity: "error" as const,
    check: (env) => {
      if (env["NODE_ENV"] === "production" && env["DEBUG"] && env["DEBUG"] !== "false" && env["DEBUG"] !== "0") {
        return ["DEBUG is enabled in production — disable it to avoid leaking sensitive information"];
      }
      return [];
    },
  }),
  Object.freeze({
    id: "no-plain-database-password",
    description: "Database passwords must not be plain text common values",
    severity: "critical" as const,
    check: (env) => {
      const weakPasswords = new Set(["password", "postgres", "root", "admin", "1234", "changeme"]);
      const dbPassKeys = Object.keys(env).filter(
        (k) => k.toUpperCase().includes("DB_PASS") || k.toUpperCase().includes("DATABASE_PASSWORD") || k.toUpperCase() === "POSTGRES_PASSWORD",
      );
      const violations: string[] = [];
      for (const key of dbPassKeys) {
        if (weakPasswords.has((env[key] ?? "").toLowerCase())) {
          violations.push(`${key}: database password is a known weak value`);
        }
      }
      return violations;
    },
  }),
  Object.freeze({
    id: "https-only-urls",
    description: "All URLs in production must use HTTPS",
    severity: "error" as const,
    check: (env) => {
      if (env["NODE_ENV"] !== "production") return [];
      const urlKeys = Object.keys(env).filter((k) => k.toUpperCase().endsWith("_URL") || k.toUpperCase().endsWith("_ENDPOINT"));
      return urlKeys
        .filter((k) => (env[k] ?? "").startsWith("http://"))
        .map((k) => `${k}: HTTP URL is not allowed in production — use HTTPS`);
    },
  }),
  Object.freeze({
    id: "no-localhost-in-production",
    description: "localhost URLs must not appear in production environment",
    severity: "warning" as const,
    check: (env) => {
      if (env["NODE_ENV"] !== "production") return [];
      const violations: string[] = [];
      for (const [k, v] of Object.entries(env)) {
        if (v.includes("localhost") || v.includes("127.0.0.1")) {
          violations.push(`${k}: contains localhost reference in production`);
        }
      }
      return violations;
    },
  }),
  Object.freeze({
    id: "required-secrets-not-empty",
    description: "Sensitive keys must not be empty",
    severity: "critical" as const,
    check: (env, schema) => {
      const violations: string[] = [];
      for (const entry of schema) {
        if ((entry.secret || isSensitiveKey(entry.key)) && entry.required) {
          const value = env[entry.key];
          if (!value || value.trim() === "") {
            violations.push(`${entry.key}: required secret is empty`);
          }
        }
      }
      return violations;
    },
  }),
]);

export interface PolicyEnforcerInput {
  readonly env: Readonly<Record<string, string>>;
  readonly schema: readonly EnvSchema[];
  readonly customPolicies?: readonly PolicyRule[];
  readonly state: Readonly<EnvValidatorState>;
}

export interface PolicyEnforcerOutput extends AgentResult {
  readonly policyErrors: readonly ValidationError[];
  readonly policyWarnings: readonly string[];
}

export function enforcePolicies(input: PolicyEnforcerInput): Readonly<PolicyEnforcerOutput> {
  const { env, schema, customPolicies = [], state } = input;
  const allPolicies = [...BUILT_IN_POLICIES, ...customPolicies];

  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  for (const policy of allPolicies) {
    const violations = policy.check(env, schema);
    for (const violation of violations) {
      if (policy.severity === "warning" || policy.severity === "info") {
        warnings.push(`[${policy.id}] ${violation}`);
      } else {
        errors.push(
          Object.freeze({
            key: policy.id,
            message: violation,
            severity: policy.severity,
          }),
        );
      }
    }
  }

  const criticalCount = errors.filter((e) => e.severity === "critical").length;
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const frozenErrors = Object.freeze(errors);
  const frozenWarnings = Object.freeze(warnings);

  const existingInvalid = state.invalid;
  const existingWarnings = state.warnings;
  const mergedInvalid = Object.freeze([...existingInvalid, ...frozenErrors]);
  const mergedWarnings = Object.freeze([...existingWarnings, ...frozenWarnings]);

  const log = buildLog(
    SOURCE,
    `Policy enforcement: ${allPolicies.length} rule(s) — ${criticalCount} critical, ${errorCount} error(s), ${frozenWarnings.length} warning(s)`,
  );

  const passed = frozenErrors.length === 0;

  return {
    nextState: transitionState(state, {
      invalid: mergedInvalid,
      warnings: mergedWarnings,
      status: passed ? "PASSED" : "FAILED",
      appendLog: log,
    }),
    output: Object.freeze({
      success: passed,
      missing: Object.freeze([]),
      invalid: frozenErrors,
      warnings: frozenWarnings,
      logs: Object.freeze([log]),
      ...(criticalCount > 0 ? { error: "critical_policy_violation" } : errorCount > 0 ? { error: "policy_violation" } : {}),
    }),
    policyErrors: frozenErrors,
    policyWarnings: frozenWarnings,
  };
}
