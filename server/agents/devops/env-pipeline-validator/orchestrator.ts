import { loadEnv } from "./agents/env-loader.agent.js";
import { checkMissing } from "./agents/missing-check.agent.js";
import { validateFormats } from "./agents/format-validator.agent.js";
import { validateSchema } from "./agents/schema-validator.agent.js";
import { detectSecrets } from "./agents/secret-detector.agent.js";
import { enforcePolicies } from "./agents/policy-enforcer.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  EnvSchema,
  EnvValidationResult,
  EnvValidatorState,
  PolicyRule,
  ValidationError,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

export interface ValidateEnvInput {
  readonly schema: readonly EnvSchema[];
  readonly envString?: string;
  readonly extraEnv?: Readonly<Record<string, string>>;
  readonly includeProcess?: boolean;
  readonly customPolicies?: readonly PolicyRule[];
  readonly abortOnMissing?: boolean;
}

function fail(
  state: Readonly<EnvValidatorState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "FAILED",
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      missing: Object.freeze([]),
      invalid: Object.freeze([]),
      warnings: Object.freeze([]),
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function validateEnv(
  input: ValidateEnvInput,
  currentState: Readonly<EnvValidatorState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (!input.schema || input.schema.length === 0) {
    return fail(currentState, "invalid_input", "schema must contain at least one entry");
  }

  let state = transitionState(currentState, { status: "VALIDATING" });

  const loaderResult = loadEnv({
    envString: input.envString,
    extraEnv: input.extraEnv,
    includeProcess: input.includeProcess ?? false,
    state,
  });
  state = loaderResult.nextState;
  const env = loaderResult.env;

  const missingResult = checkMissing({ env, schema: input.schema, state });
  state = missingResult.nextState;

  if (input.abortOnMissing && !missingResult.output.success) {
    return {
      nextState: transitionState(state, { status: "FAILED" }),
      output: missingResult.output,
    };
  }

  const formatResult = validateFormats({ env, schema: input.schema, state });
  state = formatResult.nextState;

  const schemaResult = validateSchema({ env, schema: input.schema, state });
  state = schemaResult.nextState;

  const secretResult = detectSecrets({ env, state });
  state = secretResult.nextState;

  const policyResult = enforcePolicies({
    env,
    schema: input.schema,
    customPolicies: input.customPolicies,
    state,
  });
  state = policyResult.nextState;

  const allMissing = Object.freeze([...missingResult.missing]);
  const allInvalid: ValidationError[] = [
    ...formatResult.formatErrors,
    ...schemaResult.schemaErrors,
    ...policyResult.policyErrors,
  ];
  const allWarnings: string[] = [
    ...schemaResult.warnings,
    ...secretResult.output.warnings,
    ...policyResult.policyWarnings,
  ];

  const passed =
    allMissing.length === 0 &&
    allInvalid.length === 0 &&
    secretResult.output.success;

  const log = buildLog(
    SOURCE,
    `Validation ${passed ? "PASSED" : "FAILED"} — ` +
    `${allMissing.length} missing, ${allInvalid.length} invalid, ` +
    `${allWarnings.length} warning(s)`,
  );

  const report: EnvValidationResult = Object.freeze({
    success: passed,
    missing: allMissing,
    invalid: Object.freeze(allInvalid),
    warnings: Object.freeze(allWarnings),
    logs: Object.freeze([
      ...loaderResult.output.logs,
      ...missingResult.output.logs,
      ...formatResult.output.logs,
      ...schemaResult.output.logs,
      ...secretResult.output.logs,
      ...policyResult.output.logs,
      log,
    ]),
    ...(!passed ? { error: "validation_failed" } : {}),
  });

  return {
    nextState: transitionState(state, {
      status: passed ? "PASSED" : "FAILED",
      appendLog: log,
    }),
    output: report,
  };
}

export function getEnvReport(
  input: ValidateEnvInput,
  currentState: Readonly<EnvValidatorState> = INITIAL_STATE,
): Readonly<AgentResult> {
  return validateEnv(input, currentState);
}
