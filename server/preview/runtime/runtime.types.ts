export type ProjectStatus = 'stopped' | 'starting' | 'running' | 'error' | 'stopping';
export type ReloadType = 'hot' | 'hard';
export type SignalType = 'SIGTERM' | 'SIGKILL';

export interface ProjectProcess {
  id: string;
  pid: number;
  port: number;
  status: ProjectStatus;
  startedAt: Date;
  stoppedAt?: Date;
  projectPath: string;
  command: string;
  env: Record<string, string>;
}

export interface RunProjectInput {
  id: string;
  projectPath: string;
  command?: string;
  port?: number;
  env?: Record<string, string>;
}

export interface StopProjectInput {
  id: string;
  signal?: SignalType;
  timeoutMs?: number;
}

export interface RestartProjectInput {
  id: string;
  projectPath: string;
  command?: string;
  port?: number;
  reloadType?: ReloadType;
}

export interface RunResult {
  ok: boolean;
  id: string;
  pid?: number;
  port?: number;
  error?: string;
}

export interface StopResult {
  ok: boolean;
  id: string;
  error?: string;
}

export interface RestartResult {
  ok: boolean;
  id: string;
  reloadType: ReloadType;
  error?: string;
}

export interface ProjectStatusResult {
  ok: boolean;
  running: ProjectProcess[];
  total: number;
  byStatus: Record<ProjectStatus, number>;
}

export interface RuntimeServiceEvents {
  onStart?: (process: ProjectProcess) => void;
  onStop?: (id: string) => void;
  onError?: (id: string, error: Error) => void;
  onRestart?: (id: string, reloadType: ReloadType) => void;
}

export interface RuntimeServiceConfig {
  defaultPort: number;
  defaultCommand: string;
  killTimeoutMs: number;
  startupGraceMs: number;
}
