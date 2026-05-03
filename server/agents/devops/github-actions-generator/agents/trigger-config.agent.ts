import { transitionState } from "../state.js";
import type { AgentResult, GithubActionsState, TriggerConfig, WorkflowConfig } from "../types.js";
import { buildLog } from "../utils/logger.util.js";

const SOURCE = "trigger-config";

export interface TriggerConfigInput {
  readonly config: WorkflowConfig;
  readonly state: Readonly<GithubActionsState>;
}

export interface TriggerConfigOutput extends AgentResult {
  readonly triggers: readonly TriggerConfig[];
}

export function buildTriggers(input: TriggerConfigInput): Readonly<TriggerConfigOutput> {
  const { config, state } = input;
  const triggers: TriggerConfig[] = [];

  const ciTrigger: TriggerConfig = Object.freeze({
    events: Object.freeze(["push", "pull_request"] as const),
    branches: Object.freeze(["main", "master", "develop"]),
  });
  triggers.push(ciTrigger);

  if (config.deployTarget) {
    const manualTrigger: TriggerConfig = Object.freeze({
      events: Object.freeze(["workflow_dispatch"] as const),
    });
    triggers.push(manualTrigger);
  }

  const frozen = Object.freeze(triggers);
  const log = buildLog(SOURCE, `Configured ${triggers.length} trigger(s): ${triggers.flatMap((t) => t.events).join(", ")}`);

  return {
    nextState: transitionState(state, {
      triggers: frozen,
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      yaml: "",
      logs: Object.freeze([log]),
    }),
    triggers: frozen,
  };
}
