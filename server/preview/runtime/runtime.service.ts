/**
 * runtime.service.ts — Preview Pipeline Process Adapter
 *
 * SINGLE SOURCE OF TRUTH: All process state lives in ProcessRegistry.
 * This class is a thin adapter that:
 *   1. Translates string IDs ("42" / "project-42") → numeric projectIds
 *   2. Delegates all spawn / stop / restart / query to ProcessRegistry
 *   3. Maps ProcessEntry → ProjectProcess for API response compatibility
 *
 * NO local Maps. NO local spawn calls. NO duplicate state.
 * Restart-safe: state survives backend restarts via ProcessRegistry persistence.
 */

import { existsSync } from 'fs';
import { processRegistry } from '../../infrastructure/process/process-registry.ts';
import type {
  ProjectProcess, ProjectStatus, RunProjectInput, StopProjectInput,
  RestartProjectInput, RunResult, StopResult, RestartResult,
  ProjectStatusResult, RuntimeServiceEvents, RuntimeServiceConfig,
} from './runtime.types.ts';
import type { ProcessEntry } from '../../infrastructure/process/process-types.ts';

// ─── ID parsing ───────────────────────────────────────────────────────────────

/**
 * Parse a numeric projectId from a string id like "project-42" or "42".
 * Returns undefined if the id cannot be resolved to a positive integer.
 */
function parseProjectId(id: string): number | undefined {
  const numeric = Number(id);
  if (!isNaN(numeric) && numeric > 0) return numeric;
  const match = id.match(/^project-(\d+)$/);
  if (match) return Number(match[1]);
  return undefined;
}

// ─── Entry mapping ────────────────────────────────────────────────────────────

/** Map a ProcessRegistry entry to the ProjectProcess shape used by the API. */
function toProjectProcess(id: string, entry: ProcessEntry): ProjectProcess {
  const statusMap: Record<string, ProjectStatus> = {
    starting: 'starting',
    running:  'running',
    stopped:  'stopped',
    crashed:  'error',
  };
  return {
    id,
    pid:         entry.pid,
    port:        entry.port,
    status:      statusMap[entry.status] ?? 'stopped',
    startedAt:   new Date(entry.startedAt),
    projectPath: entry.cwd,
    command:     entry.command,
    env:         {},
  };
}

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: RuntimeServiceConfig = {
  defaultPort:    0,
  defaultCommand: 'npm run dev',
  killTimeoutMs:  5000,
  startupGraceMs: 1000,
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class RuntimeService {
  events: RuntimeServiceEvents;
  private config: RuntimeServiceConfig;

  constructor(config?: Partial<RuntimeServiceConfig>, events?: RuntimeServiceEvents) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events ?? {};
  }

  // ── run ────────────────────────────────────────────────────────────────────

  async run(input: RunProjectInput): Promise<RunResult> {
    const { id, projectPath, command, env } = input;

    const projectId = parseProjectId(id);
    if (!projectId) {
      return { ok: false, id, error: `Cannot resolve numeric projectId from id: "${id}"` };
    }

    if (!existsSync(projectPath)) {
      return { ok: false, id, error: `Project path not found: ${projectPath}` };
    }

    const result = await processRegistry.start({
      projectId,
      cwd:     projectPath,
      command: command ?? this.config.defaultCommand,
      env,
    });

    if (!result.ok) return { ok: false, id, error: result.error };

    if (result.alreadyRunning) {
      return { ok: false, id, error: `Process ${id} is already running (pid: ${result.pid})` };
    }

    const entry = processRegistry.get(projectId);
    if (entry) this.events.onStart?.(toProjectProcess(id, entry));

    return { ok: true, id, pid: result.pid, port: result.port };
  }

  // ── stop ───────────────────────────────────────────────────────────────────

  async stop(input: StopProjectInput): Promise<StopResult> {
    const { id } = input;

    const projectId = parseProjectId(id);
    if (!projectId) {
      return { ok: false, id, error: `Cannot resolve numeric projectId from id: "${id}"` };
    }

    if (!processRegistry.isRunning(projectId)) {
      return { ok: false, id, error: `No running process found for id: ${id}` };
    }

    const result = processRegistry.stop(projectId);
    if (!result.ok) return { ok: false, id, error: result.error };

    this.events.onStop?.(id);
    return { ok: true, id };
  }

  // ── restart ────────────────────────────────────────────────────────────────

  async restart(input: RestartProjectInput): Promise<RestartResult> {
    const { id, projectPath, command, reloadType = 'hard' } = input;

    const projectId = parseProjectId(id);
    if (!projectId) {
      return { ok: false, id, reloadType, error: `Cannot resolve numeric projectId from id: "${id}"` };
    }

    if (!existsSync(projectPath)) {
      return { ok: false, id, reloadType, error: `Project path not found: ${projectPath}` };
    }

    const result = await processRegistry.restart({
      projectId,
      cwd:     projectPath,
      command: command ?? this.config.defaultCommand,
    });

    if (!result.ok) return { ok: false, id, reloadType, error: result.error };

    this.events.onRestart?.(id, reloadType);
    return { ok: true, id, reloadType };
  }

  // ── queries ────────────────────────────────────────────────────────────────

  getStatus(): ProjectStatusResult {
    const all = processRegistry.all();
    const running = all.map(e => toProjectProcess(String(e.projectId), e));
    const byStatus = running.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {} as Record<ProjectStatus, number>);
    return { ok: true, running, total: running.length, byStatus };
  }

  getProcess(id: string): ProjectProcess | undefined {
    const projectId = parseProjectId(id);
    if (!projectId) return undefined;
    const entry = processRegistry.get(projectId);
    return entry ? toProjectProcess(id, entry) : undefined;
  }

  isRunning(id: string): boolean {
    const projectId = parseProjectId(id);
    return projectId ? processRegistry.isRunning(projectId) : false;
  }

  /** No-op: ProcessRegistry manages its own shutdown via main.ts SIGTERM handler. */
  dispose(): void {}
}

export const runtimeService = new RuntimeService();
