import type {
  ExecutionSession,
  ExecutionPhase,
  TaskSummary,
  ExecutionMetrics,
  ProcessRecord,
  ContainerRecord,
  AllocatedPort,
  RunnerStatus,
  RunnerStateSnapshot,
} from "./types.js";

const EMPTY_METRICS: Readonly<ExecutionMetrics> = Object.freeze({
  totalTasks:      0,
  completedTasks:  0,
  failedTasks:     0,
  skippedTasks:    0,
  totalDurationMs: 0,
});

let _sessions: Map<string, Readonly<ExecutionSession>> = new Map();

export function initSession(sessionId: string, planId: string): void {
  _sessions = new Map(_sessions).set(
    sessionId,
    Object.freeze<ExecutionSession>({
      sessionId,
      planId,
      phase:             "INIT",
      startedAt:         Date.now(),
      completedAt:       null,
      runtimeSessionId:  null,
      taskSummaries:     Object.freeze([]),
      metrics:           EMPTY_METRICS,
    }),
  );
}

export function setPhase(sessionId: string, phase: ExecutionPhase): void {
  const s = _sessions.get(sessionId);
  if (s === undefined) return;
  _sessions = new Map(_sessions).set(sessionId, Object.freeze({ ...s, phase }));
}

export function setRuntimeSession(sessionId: string, runtimeSessionId: string): void {
  const s = _sessions.get(sessionId);
  if (s === undefined) return;
  _sessions = new Map(_sessions).set(sessionId, Object.freeze({ ...s, runtimeSessionId }));
}

export function addTaskSummary(sessionId: string, summary: Readonly<TaskSummary>): void {
  const s = _sessions.get(sessionId);
  if (s === undefined) return;
  const summaries = Object.freeze([...s.taskSummaries, Object.freeze(summary)]);
  _sessions = new Map(_sessions).set(sessionId, Object.freeze({ ...s, taskSummaries: summaries }));
}

export function finalise(sessionId: string, phase: "COMPLETED" | "FAILED"): void {
  const s = _sessions.get(sessionId);
  if (s === undefined) return;

  const summaries      = s.taskSummaries;
  const completedTasks = summaries.filter(t => t.outcome === "completed").length;
  const failedTasks    = summaries.filter(
    t => t.outcome === "failed" || t.outcome === "crashed" ||
         t.outcome === "timeout" || t.outcome === "spawn-error" ||
         t.outcome === "retry-exhausted",
  ).length;
  const skippedTasks   = summaries.filter(t => t.outcome === "skipped").length;
  const totalDurationMs = summaries.reduce((acc, t) => acc + t.durationMs, 0);

  const metrics: Readonly<ExecutionMetrics> = Object.freeze({
    totalTasks:      summaries.length,
    completedTasks,
    failedTasks,
    skippedTasks,
    totalDurationMs,
  });

  _sessions = new Map(_sessions).set(
    sessionId,
    Object.freeze({ ...s, phase, completedAt: Date.now(), metrics }),
  );
}

export function getSession(sessionId: string): Readonly<ExecutionSession> | undefined {
  return _sessions.get(sessionId);
}

export function clearSession(sessionId: string): void {
  const next = new Map(_sessions);
  next.delete(sessionId);
  _sessions = next;
}

export function clearAll(): void {
  _sessions = new Map();
}

export function sessionCount(): number {
  return _sessions.size;
}

// ══════════════════════════════════════════════════════════════
// Runner state — processes / containers / ports
// ══════════════════════════════════════════════════════════════

let _processes:  Map<string, Readonly<ProcessRecord>>   = new Map();
let _containers: Map<string, Readonly<ContainerRecord>> = new Map();
let _ports:      Map<number,  Readonly<AllocatedPort>>  = new Map();
let _totalRuns  = 0;
let _lastRunAt: number | null = null;

// ─── Process state ────────────────────────────────────────────

export function addProcess(record: ProcessRecord): void {
  _processes = new Map(_processes).set(record.id, Object.freeze({ ...record }));
  _totalRuns++;
  _lastRunAt = Date.now();
}

export function updateProcessStatus(id: string, status: RunnerStatus, exitCode?: number, signal?: string): void {
  const p = _processes.get(id);
  if (!p) return;
  _processes = new Map(_processes).set(id, Object.freeze({ ...p, status, exitCode, signal }));
}

export function getProcess(id: string): Readonly<ProcessRecord> | undefined {
  return _processes.get(id);
}

export function getAllProcesses(): readonly Readonly<ProcessRecord>[] {
  return Object.freeze([..._processes.values()]);
}

export function removeProcess(id: string): void {
  const next = new Map(_processes);
  next.delete(id);
  _processes = next;
}

// ─── Container state ──────────────────────────────────────────

export function addContainer(record: ContainerRecord): void {
  _containers = new Map(_containers).set(record.id, Object.freeze({ ...record }));
  _totalRuns++;
  _lastRunAt = Date.now();
}

export function updateContainerStatus(id: string, status: RunnerStatus): void {
  const c = _containers.get(id);
  if (!c) return;
  _containers = new Map(_containers).set(id, Object.freeze({ ...c, status }));
}

export function getContainer(id: string): Readonly<ContainerRecord> | undefined {
  return _containers.get(id);
}

export function findContainerByName(name: string): Readonly<ContainerRecord> | undefined {
  for (const c of _containers.values()) {
    if (c.name === name) return c;
  }
  return undefined;
}

export function getAllContainers(): readonly Readonly<ContainerRecord>[] {
  return Object.freeze([..._containers.values()]);
}

export function removeContainer(id: string): void {
  const next = new Map(_containers);
  next.delete(id);
  _containers = next;
}

// ─── Port state ───────────────────────────────────────────────

export function allocatePort(record: AllocatedPort): void {
  _ports = new Map(_ports).set(record.port, Object.freeze({ ...record }));
}

export function releasePort(port: number): void {
  const next = new Map(_ports);
  next.delete(port);
  _ports = next;
}

export function isPortAllocated(port: number): boolean {
  return _ports.has(port);
}

export function getAllocatedPorts(): readonly Readonly<AllocatedPort>[] {
  return Object.freeze([..._ports.values()]);
}

// ─── Runner snapshot ──────────────────────────────────────────

export function runnerSnapshot(): Readonly<RunnerStateSnapshot> {
  return Object.freeze({
    activeProcesses:   [..._processes.values()].filter(p => p.status === "running").length,
    runningContainers: [..._containers.values()].filter(c => c.status === "running").length,
    allocatedPorts:    _ports.size,
    totalRuns:         _totalRuns,
    lastRunAt:         _lastRunAt,
  });
}

export function resetRunnerState(): void {
  _processes  = new Map();
  _containers = new Map();
  _ports      = new Map();
  _totalRuns  = 0;
  _lastRunAt  = null;
}
