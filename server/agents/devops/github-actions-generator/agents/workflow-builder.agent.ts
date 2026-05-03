import { transitionState } from "../state.js";
import type { AgentResult, GithubActionsState, JobConfig, TriggerConfig } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { buildYaml } from "../utils/yaml-builder.util.js";

const SOURCE = "workflow-builder";

export interface WorkflowBuilderInput {
  readonly workflowName: string;
  readonly triggers: readonly TriggerConfig[];
  readonly jobs: readonly JobConfig[];
  readonly state: Readonly<GithubActionsState>;
}

export function buildWorkflow(input: WorkflowBuilderInput): Readonly<AgentResult> {
  const { workflowName, triggers, jobs, state } = input;

  if (!workflowName || workflowName.trim() === "") {
    const msg = "workflowName must not be empty";
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, yaml: "", logs: Object.freeze([buildLog(SOURCE, msg)]), error: "invalid_workflow_name" }),
    };
  }

  if (jobs.length === 0) {
    const msg = "at least one job is required to build a workflow";
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, yaml: "", logs: Object.freeze([buildLog(SOURCE, msg)]), error: "no_jobs" }),
    };
  }

  const yaml = buildYaml(workflowName, triggers, jobs);
  const log = buildLog(
    SOURCE,
    `Built workflow "${workflowName}" — ${jobs.length} job(s), ${triggers.length} trigger(s), ${yaml.split("\n").length} lines`,
  );

  return {
    nextState: transitionState(state, {
      workflowName,
      status: "COMPLETE",
      appendLog: log,
    }),
    output: Object.freeze({ success: true, yaml, logs: Object.freeze([log]) }),
  };
}
