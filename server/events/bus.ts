import { EventEmitter } from "events";

export type AgentEventType =
  | "phase.started"
  | "phase.completed"
  | "phase.failed"
  | "agent.thinking"
  | "agent.tool_call"
  | "agent.message"
  | "agent.question"
  | "file.written"
  | "file.diff"
  | "diff.queued";

export interface AgentEvent {
  runId: string;
  projectId?: number;
  phase?: string;
  agentName?: string;
  eventType: AgentEventType;
  payload?: unknown;
  ts: number;
}

export interface ConsoleEvent {
  projectId: number;
  stream: "stdout" | "stderr";
  line: string;
  ts: number;
}

export interface FileChangeEvent {
  projectId: number;
  path: string;
  kind: "add" | "change" | "unlink";
  ts: number;
}

export interface RunLifecycleEvent {
  runId: string;
  projectId?: number;
  status: "started" | "completed" | "failed" | "cancelled";
  ts: number;
}

interface BusEventMap {
  "agent.event": AgentEvent;
  "console.log": ConsoleEvent;
  "file.change": FileChangeEvent;
  "run.lifecycle": RunLifecycleEvent;
}

class TypedBus {
  private emitter = new EventEmitter();
  constructor() {
    this.emitter.setMaxListeners(0);
  }
  emit<K extends keyof BusEventMap>(event: K, payload: BusEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
  on<K extends keyof BusEventMap>(event: K, listener: (payload: BusEventMap[K]) => void): () => void {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }
}

export const bus = new TypedBus();
