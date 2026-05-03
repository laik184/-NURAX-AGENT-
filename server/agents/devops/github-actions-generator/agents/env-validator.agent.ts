import { transitionState } from "../state.js";
import type { AgentResult, EnvVar, GithubActionsState, WorkflowConfig } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";

const SOURCE = "env-validator";

export interface EnvValidatorInput {
  readonly config: WorkflowConfig;
  readonly state: Readonly<GithubActionsState>;
}

export interface EnvValidatorOutput extends AgentResult {
  readonly missingVars: readonly string[];
  readonly valid: boolean;
}

export function validateEnv(input: EnvValidatorInput): Readonly<EnvValidatorOutput> {
  const { config, state } = input;
  const envVars: readonly EnvVar[] = config.envVars ?? [];

  if (envVars.length === 0) {
    const log = buildLog(SOURCE, "No environment variables declared — skipping validation");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, yaml: "", logs: Object.freeze([log]) }),
      missingVars: Object.freeze([]),
      valid: true,
    };
  }

  const requiredSecrets = envVars.filter((e) => e.required && e.secret);
  const missingVars: string[] = [];

  for (const envVar of requiredSecrets) {
    if (!envVar.name || envVar.name.trim() === "") {
      missingVars.push("(unnamed required secret)");
    }
  }

  const requiredNonSecret = envVars.filter((e) => e.required && !e.secret && !e.defaultValue);
  for (const envVar of requiredNonSecret) {
    if (!envVar.defaultValue) {
      missingVars.push(envVar.name);
    }
  }

  if (missingVars.length > 0) {
    const msg = `Missing default values for required non-secret vars: ${missingVars.join(", ")}`;
    const errorLog = buildError(SOURCE, msg);
    const log = buildLog(SOURCE, msg);
    return {
      nextState: transitionState(state, { appendLog: log, appendError: errorLog }),
      output: Object.freeze({ success: false, yaml: "", logs: Object.freeze([log]), error: "missing_env_vars" }),
      missingVars: Object.freeze(missingVars),
      valid: false,
    };
  }

  const secretNames = requiredSecrets.map((e) => e.name);
  const log = buildLog(
    SOURCE,
    `Validated ${envVars.length} env var(s). Secrets required in GitHub: ${secretNames.join(", ") || "none"}`,
  );

  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({ success: true, yaml: "", logs: Object.freeze([log]) }),
    missingVars: Object.freeze([]),
    valid: true,
  };
}
