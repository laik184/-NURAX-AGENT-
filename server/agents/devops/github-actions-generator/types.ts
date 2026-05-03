export type WorkflowStatus = "IDLE" | "BUILDING" | "COMPLETE" | "FAILED";

export type Language = "node" | "python" | "go" | "java" | "rust" | "generic";

export type DeployTarget = "staging" | "production" | "both";

export type TriggerEvent = "push" | "pull_request" | "workflow_dispatch" | "schedule";

export type RunnerOs = "ubuntu-latest" | "windows-latest" | "macos-latest";

export interface TriggerConfig {
  readonly events: readonly TriggerEvent[];
  readonly branches?: readonly string[];
  readonly paths?: readonly string[];
  readonly cron?: string;
}

export interface EnvVar {
  readonly name: string;
  readonly required: boolean;
  readonly secret: boolean;
  readonly defaultValue?: string;
}

export interface StepConfig {
  readonly id?: string;
  readonly name: string;
  readonly uses?: string;
  readonly run?: string;
  readonly with?: Readonly<Record<string, string>>;
  readonly env?: Readonly<Record<string, string>>;
  readonly if?: string;
  readonly workingDirectory?: string;
}

export interface JobConfig {
  readonly id: string;
  readonly name: string;
  readonly runsOn: RunnerOs;
  readonly needs?: readonly string[];
  readonly steps: readonly StepConfig[];
  readonly env?: Readonly<Record<string, string>>;
  readonly if?: string;
  readonly timeoutMinutes?: number;
}

export interface WorkflowConfig {
  readonly name: string;
  readonly language: Language;
  readonly nodeVersion?: string;
  readonly pythonVersion?: string;
  readonly packageManager?: "npm" | "yarn" | "pnpm" | "pip" | "poetry";
  readonly triggers: TriggerConfig;
  readonly deployTarget?: DeployTarget;
  readonly envVars?: readonly EnvVar[];
  readonly workingDirectory?: string;
  readonly buildCommand?: string;
  readonly testCommand?: string;
  readonly lintCommand?: string;
  readonly deployCommand?: string;
  readonly runsOn?: RunnerOs;
}

export interface WorkflowResult {
  readonly success: boolean;
  readonly yaml: string;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface GithubActionsState {
  readonly workflowName: string;
  readonly jobs: readonly JobConfig[];
  readonly steps: readonly StepConfig[];
  readonly triggers: readonly TriggerConfig[];
  readonly status: WorkflowStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface StatePatch {
  readonly workflowName?: string;
  readonly jobs?: readonly JobConfig[];
  readonly steps?: readonly StepConfig[];
  readonly triggers?: readonly TriggerConfig[];
  readonly status?: WorkflowStatus;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface AgentResult {
  readonly nextState: Readonly<GithubActionsState>;
  readonly output: Readonly<WorkflowResult>;
}
