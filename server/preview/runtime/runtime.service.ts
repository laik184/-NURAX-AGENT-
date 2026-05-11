import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import type {
  ProjectProcess, ProjectStatus, RunProjectInput, StopProjectInput,
  RestartProjectInput, RunResult, StopResult, RestartResult,
  ProjectStatusResult, RuntimeServiceEvents, RuntimeServiceConfig,
} from './runtime.types.ts';

const DEFAULT_CONFIG: RuntimeServiceConfig = {
  defaultPort: 3000,
  defaultCommand: 'npm run dev',
  killTimeoutMs: 5000,
  startupGraceMs: 1000,
};

export class RuntimeService {
  private processes = new Map<string, ProjectProcess>();
  private nativeProcesses = new Map<string, ChildProcess>();
  private events: RuntimeServiceEvents;
  private config: RuntimeServiceConfig;

  constructor(config?: Partial<RuntimeServiceConfig>, events?: RuntimeServiceEvents) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events ?? {};
  }

  async run(input: RunProjectInput): Promise<RunResult> {
    const { id, projectPath, command, port, env } = input;

    if (!existsSync(projectPath)) {
      return { ok: false, id, error: `Project path not found: ${projectPath}` };
    }

    const existing = this.processes.get(id);
    if (existing && existing.status === 'running') {
      return { ok: false, id, error: `Process ${id} is already running (pid: ${existing.pid})` };
    }

    const resolvedPort = port ?? this.config.defaultPort;
    const resolvedCmd = command ?? this.config.defaultCommand;
    const [cmd, ...args] = resolvedCmd.split(' ');

    const proc = spawn(cmd, args, {
      cwd: projectPath,
      env: { ...process.env, PORT: String(resolvedPort), ...env },
      stdio: 'pipe',
      detached: false,
    });

    if (!proc.pid) {
      return { ok: false, id, error: 'Failed to spawn process — no PID assigned' };
    }

    const record: ProjectProcess = {
      id, pid: proc.pid, port: resolvedPort, status: 'starting',
      startedAt: new Date(), projectPath,
      command: resolvedCmd, env: env ?? {},
    };

    this.processes.set(id, record);
    this.nativeProcesses.set(id, proc);

    proc.stdout?.on('data', () => this.setStatus(id, 'running'));
    proc.stderr?.on('data', (chunk) => {
      const msg = chunk.toString();
      if (msg.includes('Error') || msg.includes('error')) {
        this.setStatus(id, 'error');
        this.events.onError?.(id, new Error(msg));
      }
    });

    proc.on('exit', () => {
      this.setStatus(id, 'stopped', new Date());
      this.nativeProcesses.delete(id);
      this.events.onStop?.(id);
    });

    await this.grace(this.config.startupGraceMs);
    this.setStatus(id, 'running');
    this.events.onStart?.(this.processes.get(id)!);

    return { ok: true, id, pid: proc.pid, port: resolvedPort };
  }

  async stop(input: StopProjectInput): Promise<StopResult> {
    const { id, signal = 'SIGTERM', timeoutMs } = input;
    const record = this.processes.get(id);
    const proc = this.nativeProcesses.get(id);

    if (!record || !proc) {
      return { ok: false, id, error: `No running process found for id: ${id}` };
    }

    this.setStatus(id, 'stopping');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
        this.setStatus(id, 'stopped', new Date());
        resolve({ ok: true, id });
      }, timeoutMs ?? this.config.killTimeoutMs);

      proc.once('exit', () => {
        clearTimeout(timeout);
        this.setStatus(id, 'stopped', new Date());
        resolve({ ok: true, id });
      });

      try { proc.kill(signal); } catch (e: any) {
        clearTimeout(timeout);
        resolve({ ok: false, id, error: e.message });
      }
    });
  }

  async restart(input: RestartProjectInput): Promise<RestartResult> {
    const { id, projectPath, command, port, reloadType = 'hard' } = input;

    const stopResult = await this.stop({ id });
    if (!stopResult.ok) {
      return { ok: false, id, reloadType, error: stopResult.error };
    }

    const runResult = await this.run({ id, projectPath, command, port });
    if (!runResult.ok) {
      return { ok: false, id, reloadType, error: runResult.error };
    }

    this.events.onRestart?.(id, reloadType);
    return { ok: true, id, reloadType };
  }

  getStatus(): ProjectStatusResult {
    const running = Array.from(this.processes.values());
    const byStatus = running.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {} as Record<ProjectStatus, number>);

    return { ok: true, running, total: running.length, byStatus };
  }

  getProcess(id: string): ProjectProcess | undefined {
    return this.processes.get(id);
  }

  isRunning(id: string): boolean {
    return this.processes.get(id)?.status === 'running';
  }

  private setStatus(id: string, status: ProjectStatus, stoppedAt?: Date) {
    const p = this.processes.get(id);
    if (p) this.processes.set(id, { ...p, status, ...(stoppedAt ? { stoppedAt } : {}) });
  }

  private grace(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  dispose(): void {
    for (const [id, proc] of this.nativeProcesses) {
      try { proc.kill('SIGKILL'); } catch {}
      this.setStatus(id, 'stopped');
    }
    this.processes.clear();
    this.nativeProcesses.clear();
  }
}

export const runtimeService = new RuntimeService();
