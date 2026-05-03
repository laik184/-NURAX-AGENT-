import { transitionState } from "../state.js";
import type { AgentResult, DeployTarget, GithubActionsState, StepConfig, WorkflowConfig } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { buildDeployStep } from "../utils/step-mapper.util.js";

const SOURCE = "deploy-strategy";

export interface DeployStrategyInput {
  readonly config: WorkflowConfig;
  readonly state: Readonly<GithubActionsState>;
}

export interface DeployStrategyOutput extends AgentResult {
  readonly stagingSteps: readonly StepConfig[];
  readonly productionSteps: readonly StepConfig[];
  readonly strategy: DeployTarget | null;
}

const CHECKOUT_STEP: StepConfig = Object.freeze({
  name: "Checkout code",
  uses: "actions/checkout@v4",
});

export function resolveDeployStrategy(input: DeployStrategyInput): Readonly<DeployStrategyOutput> {
  const { config, state } = input;

  if (!config.deployTarget) {
    const log = buildLog(SOURCE, "No deploy target configured — CD jobs will be omitted");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, yaml: "", logs: Object.freeze([log]) }),
      stagingSteps: Object.freeze([]),
      productionSteps: Object.freeze([]),
      strategy: null,
    };
  }

  const target = config.deployTarget;
  const stagingSteps: StepConfig[] =
    target === "staging" || target === "both"
      ? [CHECKOUT_STEP, buildDeployStep(config, "staging")]
      : [];

  const productionSteps: StepConfig[] =
    target === "production" || target === "both"
      ? [CHECKOUT_STEP, buildDeployStep(config, "production")]
      : [];

  const environments: string[] = [];
  if (stagingSteps.length > 0) environments.push("staging");
  if (productionSteps.length > 0) environments.push("production");

  const log = buildLog(SOURCE, `Deploy strategy: ${target} — environments: ${environments.join(", ")}`);

  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({ success: true, yaml: "", logs: Object.freeze([log]) }),
    stagingSteps: Object.freeze(stagingSteps),
    productionSteps: Object.freeze(productionSteps),
    strategy: target,
  };
}
