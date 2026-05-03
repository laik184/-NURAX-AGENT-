export type ExecutionPhase =
  | "INIT"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export type TaskOutcome =
  | "completed"
  | "failed"
  | "timeout"
  | "crashed"
  | "spawn-error"
  | "retry-exhausted"
  | "skipped";

// ── Plan input ─────────────────────────────────────────────────────────────

export interface ExecutionTaskSpec {
  readonly taskId:        string;
  readonly label:         string;
  readonly command:       string;
  readonly args?:         readonly string[];
  readonly cwd?:          string;
  readonly env?:          Readonly<Record<string, string>>;
  readonly timeoutMs?:    number;
  readonly maxAttempts?:  number;
  readonly dependsOn?:    readonly string[];
}

export interface RuntimeSpec {
  readonly command:    string;
  readonly args?:      readonly string[];
  readonly cwd?:       string;
  readonly env?:       Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface ExecutionPlan {
  readonly planId:          string;
  readonly mode:            "sequential" | "parallel";
  readonly tasks:           readonly Readonly<ExecutionTaskSpec>[];
  readonly runtime?:        Readonly<RuntimeSpec>;
  readonly globalTimeoutMs?: number;
  readonly maxConcurrency?:  number;
}

// ── Aggregated task summary ────────────────────────────────────────────────

export interface TaskSummary {
  readonly taskId:      string;
  readonly label:       string;
  readonly outcome:     TaskOutcome;
  readonly exitCode:    number | null;
  readonly durationMs:  number;
  readonly attempts:    number;
  readonly stderr:      string;
}

// ── Session (state layer) ──────────────────────────────────────────────────

export interface ExecutionMetrics {
  readonly totalTasks:     number;
  readonly completedTasks: number;
  readonly failedTasks:    number;
  readonly skippedTasks:   number;
  readonly totalDurationMs: number;
}

export interface ExecutionSession {
  readonly sessionId:        string;
  readonly planId:           string;
  readonly phase:            ExecutionPhase;
  readonly startedAt:        number;
  readonly completedAt:      number | null;
  readonly runtimeSessionId: string | null;
  readonly taskSummaries:    readonly Readonly<TaskSummary>[];
  readonly metrics:          Readonly<ExecutionMetrics>;
}

// ── Result output ──────────────────────────────────────────────────────────

export interface ExecutionResult {
  readonly sessionId:        string;
  readonly planId:           string;
  readonly phase:            ExecutionPhase;
  readonly success:          boolean;
  readonly totalTasks:       number;
  readonly completedTasks:   number;
  readonly failedTasks:      number;
  readonly skippedTasks:     number;
  readonly durationMs:       number;
  readonly runtimeSessionId: string | null;
  readonly taskSummaries:    readonly Readonly<TaskSummary>[];
  readonly startedAt:        number;
  readonly completedAt:      number;
}

// ── Agent result envelope ──────────────────────────────────────────────────

export interface OrchestratorResult<T = undefined> {
  readonly ok:     boolean;
  readonly error?: string;
  readonly code?:  string;
  readonly data?:  T;
}

// ══════════════════════════════════════════════════════════════
// Runner types — process / docker / network execution
// ══════════════════════════════════════════════════════════════

export type RunnerType      = "process" | "docker" | "network";
export type RunnerStatus    = "pending" | "running" | "success" | "failed" | "killed";
export type NetworkProtocol = "tcp" | "udp";
export type DockerAction    = "run" | "stop" | "remove" | "build" | "inspect";
export type ProcessSignal   = "SIGTERM" | "SIGKILL" | "SIGINT" | "SIGHUP";

export interface PortBinding {
  readonly host:      number;
  readonly container: number;
  readonly protocol:  NetworkProtocol;
}

export interface ExecOptions {
  readonly cwd?:      string;
  readonly env?:      Readonly<Record<string, string>>;
  readonly timeout?:  number;
}

export interface ExecOutput {
  readonly stdout:   string;
  readonly stderr:   string;
  readonly code:     number | null;
  readonly signal:   string | null;
  readonly timedOut: boolean;
}

export interface RunnerRequest {
  readonly id:             string;
  readonly type:           RunnerType;
  readonly command:        string;
  readonly args?:          readonly string[];
  readonly env?:           Readonly<Record<string, string>>;
  readonly cwd?:           string;
  readonly timeout?:       number;
  readonly containerName?: string;
  readonly image?:         string;
  readonly ports?:         readonly PortBinding[];
  readonly port?:          number;
  readonly protocol?:      NetworkProtocol;
  readonly ownerId?:       string;
}

export interface RunnerMeta {
  readonly pid?:         number;
  readonly containerId?: string;
  readonly port?:        number;
  readonly exitCode?:    number;
  readonly signal?:      string;
  readonly timedOut?:    boolean;
  readonly requestId?:   string;
}

export interface RunnerResult {
  readonly success:   boolean;
  readonly type:      RunnerType;
  readonly output?:   string;
  readonly error?:    string;
  readonly meta:      Readonly<RunnerMeta>;
  readonly timestamp: number;
}

export interface ProcessRecord {
  readonly id:        string;
  readonly pid:       number;
  readonly command:   string;
  readonly args:      readonly string[];
  readonly status:    RunnerStatus;
  readonly startedAt: number;
  readonly exitCode?: number;
  readonly signal?:   string;
}

export interface ContainerRecord {
  readonly id:          string;
  readonly containerId: string;
  readonly name:        string;
  readonly image:       string;
  readonly status:      RunnerStatus;
  readonly ports:       readonly PortBinding[];
  readonly startedAt:   number;
}

export interface AllocatedPort {
  readonly port:        number;
  readonly protocol:    NetworkProtocol;
  readonly allocatedAt: number;
  readonly ownerId:     string;
}

export interface RouteDecision {
  readonly target:  RunnerType;
  readonly reason:  string;
  readonly request: Readonly<RunnerRequest>;
}

export interface RunnerStateSnapshot {
  readonly activeProcesses:   number;
  readonly runningContainers: number;
  readonly allocatedPorts:    number;
  readonly totalRuns:         number;
  readonly lastRunAt:         number | null;
}
