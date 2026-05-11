export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';
export type SseChannel = 'console' | 'preview' | 'reload';
export type NetworkMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export interface ConsoleLog {
  id: string;
  type: LogLevel;
  message: string;
  time: string;
  source?: string;
  projectId?: string;
}

export interface NetworkRequest {
  id: string;
  method: NetworkMethod;
  url: string;
  status: string;
  type: string;
  time: string;
  duration?: number;
  size?: number;
}

export interface SseClient {
  id: string;
  channel: SseChannel;
  connectedAt: Date;
  lastPingAt: Date;
  projectId?: string;
  res: import('express').Response;
}

export interface SseMessage {
  type: SseChannel | 'done' | 'ping';
  data: unknown;
  id?: string;
  timestamp?: number;
}

export interface BroadcastResult {
  ok: boolean;
  sent: number;
  channel: SseChannel;
}

export interface DevtoolsSnapshot {
  consoleLogs: ConsoleLog[];
  networkRequests: NetworkRequest[];
  clientCount: number;
  byChannel: Record<SseChannel, number>;
}

export interface DevtoolsServiceConfig {
  maxLogBuffer: number;
  pingIntervalMs: number;
  clientTimeoutMs: number;
}
