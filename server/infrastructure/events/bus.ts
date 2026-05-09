import { EventEmitter } from "events";

export interface AgentEvent {
  runId: string;
  projectId?: number;
  phase?: string;
  agentName?: string;
  eventType: string;
  payload?: unknown;
  ts: number;
}

export interface RunLifecycleEvent {
  runId: string;
  projectId: number;
  status: "started" | "completed" | "failed" | "cancelled";
  ts: number;
}

export interface ConsoleLogEvent {
  projectId: number;
  stream: "stdout" | "stderr";
  line: string;
  ts: number;
}

export interface FileChangeEvent {
  projectId: number;
  type: "add" | "change" | "unlink";
  path: string;
  ts: number;
}

type BusEvents = {
  "agent.event": (event: AgentEvent) => void;
  "run.lifecycle": (event: RunLifecycleEvent) => void;
  "console.log": (event: ConsoleLogEvent) => void;
  "file.change": (event: FileChangeEvent) => void;
};

class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof BusEvents>(event: K, ...args: Parameters<BusEvents[K]>): boolean {
    return super.emit(event as string, ...args);
  }
  on<K extends keyof BusEvents>(event: K, listener: BusEvents[K]): this {
    return super.on(event as string, listener as (...args: any[]) => void);
  }
  once<K extends keyof BusEvents>(event: K, listener: BusEvents[K]): this {
    return super.once(event as string, listener as (...args: any[]) => void);
  }
  off<K extends keyof BusEvents>(event: K, listener: BusEvents[K]): this {
    return super.off(event as string, listener as (...args: any[]) => void);
  }
}

export const bus = new TypedEventEmitter();
bus.setMaxListeners(100);
