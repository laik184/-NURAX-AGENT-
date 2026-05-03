import { transitionState } from "../state.js";
import type { AgentResult, GithubActionsState, StepConfig, WorkflowConfig } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { buildCiSteps, buildDeployStep } from "../utils/step-mapper.util.js";

const SOURCE = "step-generator";

export interface StepGeneratorInput {
  readonly config: WorkflowConfig;
  readonly state: Readonly<GithubActionsState>;
}

export interface StepGeneratorOutput extends AgentResult {
  readonly ciSteps: readonly StepConfig[];
  readonly stagingSteps: readonly StepConfig[];
  readonly productionSteps: readonly StepConfig[];
}

export function generateSteps(input: StepGeneratorInput): Readonly<StepGeneratorOutput> {
  const { config, state } = input;

  const ciSteps = buildCiSteps(config);

  const stagingSteps: StepConfig[] = config.deployTarget
    ? [Object.freeze({ name: "Checkout code", uses: "actions/checkout@v4" }), buildDeployStep(config, "staging")]
    : [];

  const productionSteps: StepConfig[] = config.deployTarget
    ? [Object.freeze({ name: "Checkout code", uses: "actions/checkout@v4" }), buildDeployStep(config, "production")]
    : [];

  const allSteps = Object.freeze([...ciSteps, ...stagingSteps, ...productionSteps]);
  const log = buildLog(
    SOURCE,
    `Generated ${ciSteps.length} CI step(s), ${stagingSteps.length} staging step(s), ${productionSteps.length} production step(s)`,
  );

  return {
    nextState: transitionState(state, { steps: allSteps, appendLog: log }),
    output: Object.freeze({ success: true, yaml: "", logs: Object.freeze([log]) }),
    ciSteps: Object.freeze(ciSteps),
    stagingSteps: Object.freeze(stagingSteps),
    productionSteps: Object.freeze(productionSteps),
  };
}
