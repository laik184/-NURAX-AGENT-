import type { CodeFixerInput, FixResult, FixStep } from "./types.js";

export type CodeFixerStatus =
  | "idle"
  | "normalizing"
  | "detecting-smells"
  | "planning-fixes"
  | "applying-fixes"
  | "verifying"
  | "complete"
  | "failed";

export interface CodeFixerSession {
  readonly sessionId: string;
  readonly startedAt: number;
  readonly input: Readonly<CodeFixerInput>;
  readonly status: CodeFixerStatus;
  readonly iteration: number;
  readonly appliedCount: number;
  readonly failedCount: number;
  readonly logs: readonly string[];
  readonly result?: Readonly<FixResult>;
}

const _sessions = new Map<string, CodeFixerSession>();
const _logs: string[] = [];
const MAX_LOG = 500;

let _sessionCounter = 0;

export function generateSessionId(): string {
  _sessionCounter += 1;
  return `cf-session-${Date.now()}-${String(_sessionCounter).padStart(4, "0")}`;
}

export function initSession(sessionId: string, input: Readonly<CodeFixerInput>): void {
  _sessions.set(sessionId, Object.freeze({
    sessionId,
    startedAt: Date.now(),
    input,
    status: "idle",
    iteration: 0,
    appliedCount: 0,
    failedCount: 0,
    logs: Object.freeze([]),
  }));
}

export function setStatus(sessionId: string, status: CodeFixerStatus): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, status }));
}

export function incrementIteration(sessionId: string): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, iteration: session.iteration + 1 }));
}

export function recordApplied(sessionId: string, steps: readonly FixStep[]): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({
    ...session,
    appliedCount: session.appliedCount + steps.length,
  }));
}

export function recordFailed(sessionId: string, steps: readonly FixStep[]): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({
    ...session,
    failedCount: session.failedCount + steps.length,
  }));
}

export function addLog(sessionId: string, message: string): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  const entry = `[${new Date().toISOString()}] [${sessionId}] ${message}`;
  const logs = [...session.logs, entry].slice(-100);
  _sessions.set(sessionId, Object.freeze({ ...session, logs: Object.freeze(logs) }));
  if (_logs.length >= MAX_LOG) _logs.shift();
  _logs.push(entry);
}

export function setResult(sessionId: string, result: Readonly<FixResult>): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, result, status: "complete" }));
}

export function getState(sessionId: string): Readonly<CodeFixerSession> | undefined {
  const session = _sessions.get(sessionId);
  if (!session) return undefined;
  return Object.freeze({ ...session });
}

export function getGlobalLogs(): readonly string[] {
  return Object.freeze([..._logs]);
}

export function clearSession(sessionId: string): void {
  _sessions.delete(sessionId);
}

export function clearAll(): void {
  _sessions.clear();
  _logs.length = 0;
}

export function sessionCount(): number {
  return _sessions.size;
}
