export type WatchEventType = 'created' | 'updated' | 'renamed' | 'deleted' | 'ping';
export type WatchChannel = 'files';

export interface WatchEvent {
  type: WatchEventType;
  path: string;
  oldPath?: string;
  projectId: string;
  timestamp: Date;
}

export interface WatchClient {
  id: string;
  projectId: string;
  connectedAt: Date;
  lastPingAt: Date;
  res: import('express').Response;
}

export interface BroadcastResult {
  ok: boolean;
  sent: number;
  projectId?: string;
}

export interface WatcherSnapshot {
  clientCount: number;
  byProject: Record<string, number>;
  watchedPaths: string[];
}

export interface RegisterWatcherInput {
  projectId: string;
  watchPath?: string;
}

export interface WatcherServiceConfig {
  pingIntervalMs: number;
  clientTimeoutMs: number;
  debounceMs: number;
}
