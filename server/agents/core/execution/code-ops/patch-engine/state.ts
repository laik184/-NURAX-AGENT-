import type {
  PatchSession,
  TransformationRecord,
  PatchResult,
} from "./types.js";

const _sessions   = new Map<string, PatchSession>();
const _history:  TransformationRecord[] = [];

export function initSession(sessionId: string, code: string): void {
  _sessions.set(sessionId, Object.freeze({
    sessionId,
    startedAt: Date.now(),
    code,
    patches:   Object.freeze([]),
    completed: false,
  }));
}

export function recordPatch(
  sessionId: string,
  result:    Readonly<PatchResult>,
): void {
  const session = _sessions.get(sessionId);
  if (!session) return;

  const record: TransformationRecord = Object.freeze({
    transformationId: result.transformationId,
    patchType:        result.patchType,
    status:           result.status,
    appliedAt:        result.appliedAt,
  });

  _sessions.set(sessionId, Object.freeze({
    ...session,
    patches: Object.freeze([...session.patches, record]),
  }));

  if (_history.length >= 200) _history.shift();
  _history.push(record);
}

export function completeSession(sessionId: string): void {
  const session = _sessions.get(sessionId);
  if (!session) return;
  _sessions.set(sessionId, Object.freeze({ ...session, completed: true }));
}

export function getSession(
  sessionId: string,
): Readonly<PatchSession> | undefined {
  return _sessions.get(sessionId);
}

export function getHistory(): readonly TransformationRecord[] {
  return Object.freeze([..._history]);
}

export function clearSession(sessionId: string): void {
  _sessions.delete(sessionId);
}

export function clearAll(): void {
  _sessions.clear();
  _history.length = 0;
}

export function sessionCount(): number {
  return _sessions.size;
}

export function historyCount(): number {
  return _history.length;
}
