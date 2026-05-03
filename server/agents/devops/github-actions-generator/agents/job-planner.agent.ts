import { transitionState } from "../state.js";
import type {
  AgentResult,
  GithubActionsState,
  JobConfig,
  RunnerOs,
  StepConfig,
  WorkflowConfig,
} from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import {
  buildCiJob,
  buildDeployStagingJob,
  buildDeployProductionJob,
  buildNotifyJob,
} from "../utils/job-mapper.util.js";

const SOURCE = "job-planner";

export interface JobPlannerInput {
  readonly config: WorkflowConfig;
  readonly ciSteps: readonly StepConfig[];
  readonly stagingSteps: readonly StepConfig[];
  readonly productionSteps: readonly StepConfig[];
  readonly state: Readonly<GithubActionsState>;
}

export interface JobPlannerOutput extends AgentResult {
  readonly jobs: readonly JobConfig[];
}

export function planJobs(input: JobPlannerInput): Readonly<JobPlannerOutput> {
  const { config, ciSteps, stagingSteps, productionSteps, state } = input;
  const runsOn: RunnerOs = config.runsOn ?? "ubuntu-latest";
  const jobs: JobConfig[] = [];

  const ciJob = buildCiJob(ciSteps, runsOn);
  jobs.push(ciJob);

  if (config.deployTarget === "staging" || config.deployTarget === "both") {
    jobs.push(buildDeployStagingJob(stagingSteps, runsOn));
  }

  if (config.deployTarget === "production" || config.deployTarget === "both") {
    jobs.push(buildDeployProductionJob(productionSteps, runsOn));
  }

  const dependsOn = jobs.map((j) => j.id);
  jobs.push(buildNotifyJob(runsOn, dependsOn));

  const frozen = Object.freeze(jobs);
  const log = buildLog(SOURCE, `Planned ${frozen.length} job(s): ${frozen.map((j) => j.id).join(", ")}`);

  return {
    nextState: transitionState(state, { jobs: frozen, appendLog: log }),
    output: Object.freeze({ success: true, yaml: "", logs: Object.freeze([log]) }),
    jobs: frozen,
  };
}
