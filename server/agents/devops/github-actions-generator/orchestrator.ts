import { validateEnv } from "./agents/env-validator.agent.js";
import { buildTriggers } from "./agents/trigger-config.agent.js";
import { resolveDeployStrategy } from "./agents/deploy-strategy.agent.js";
import { generateSteps } from "./agents/step-generator.agent.js";
import { planJobs } from "./agents/job-planner.agent.js";
import { buildWorkflow } from "./agents/workflow-builder.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  GithubActionsState,
  WorkflowConfig,
  WorkflowResult,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<GithubActionsState>,
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
      yaml: "",
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function generateWorkflow(
  config: WorkflowConfig,
  currentState: Readonly<GithubActionsState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (!config.name || config.name.trim() === "") {
    return fail(currentState, "invalid_config", "WorkflowConfig.name is required");
  }

  let state = transitionState(currentState, { status: "BUILDING", workflowName: config.name });

  const envResult = validateEnv({ config, state });
  state = envResult.nextState;
  if (!envResult.valid) return envResult;

  const triggerResult = buildTriggers({ config, state });
  state = triggerResult.nextState;

  const deployResult = resolveDeployStrategy({ config, state });
  state = deployResult.nextState;

  const stepResult = generateSteps({ config, state });
  state = stepResult.nextState;

  const jobResult = planJobs({
    config,
    ciSteps: stepResult.ciSteps,
    stagingSteps: deployResult.stagingSteps,
    productionSteps: deployResult.productionSteps,
    state,
  });
  state = jobResult.nextState;

  const workflowResult = buildWorkflow({
    workflowName: config.name,
    triggers: triggerResult.triggers,
    jobs: jobResult.jobs,
    state,
  });
  state = workflowResult.nextState;

  const log = buildLog(
    SOURCE,
    `Workflow "${config.name}" generated successfully — ${workflowResult.output.yaml.split("\n").length} lines`,
  );

  const report: WorkflowResult = Object.freeze({
    success: true,
    yaml: workflowResult.output.yaml,
    logs: Object.freeze([
      ...envResult.output.logs,
      ...triggerResult.output.logs,
      ...deployResult.output.logs,
      ...stepResult.output.logs,
      ...jobResult.output.logs,
      ...workflowResult.output.logs,
      log,
    ]),
  });

  return {
    nextState: transitionState(state, { status: "COMPLETE", appendLog: log }),
    output: report,
  };
}

export function validateWorkflow(
  config: WorkflowConfig,
  currentState: Readonly<GithubActionsState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (!config.name || config.name.trim() === "") {
    return fail(currentState, "invalid_config", "WorkflowConfig.name is required");
  }
  return validateEnv({ config, state: currentState });
}

export function previewWorkflow(
  config: WorkflowConfig,
  currentState: Readonly<GithubActionsState> = INITIAL_STATE,
): Readonly<AgentResult> {
  return generateWorkflow(config, currentState);
}
