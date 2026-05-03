import type { DiffProposerInput, DiffProposerOutput } from "./types.js";

export type DiffProposerStatus =
  | "idle"
  | "parsing-intent"
  | "loading-files"
  | "analyzing-ast"
  | "locating-edits"
  | "planning-edits"
  | "generating-diffs"
  | "safety-check"
  | "complete"
  | "failed";

export interface DiffProposerSession {
  readonly sessionId: string;
  readonly startedAt: number;
  readonly input: Readonly<DiffProposerInput>;
  readonly status: DiffProposerStatus;
  readonly proposalCount: number;
  readonly warningCount: number;
  readonly logs: readonly string[];
  readonly output?: Readonly<DiffProposerOutput>;
}

const _sessions = new Map<string, DiffProposerSession>();
const _logs: string[] = [];
const MAX_LOG = 500;

let _sessionCounter = 0;

export function generateSessionId(): string {
  _sessionCounter += 1;
  return `dp-session-${Date.now()}-${String(_sessionCounter).padStart(4, "0")}`;
}

export function initSession(sessionId: string, input: Readonly<DiffProposerInput>): void {
  _sessions.set(sessionId, Object.freeze({
    sessionId,
    startedAt: Date.now(),
    input,
    status: "idle",
    proposalCount: 0,
    warningCount: 0,
    logs: Object.freeze([]),
  }));
}

export function setStatus(sessionId: string, status: DiffProposerStatus): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, status }));
}

export function setProposalCount(sessionId: string, count: number): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, proposalCount: count }));
}

export function setWarningCount(sessionId: string, count: number): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, warningCount: count }));
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

export function setOutput(sessionId: string, output: Readonly<DiffProposerOutput>): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({
    ...session,
    output,
    status: "complete",
    proposalCount: output.proposals.length,
    warningCount: output.warnings.length,
  }));
}

export function getState(sessionId: string): Readonly<DiffProposerSession> | undefined {
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
