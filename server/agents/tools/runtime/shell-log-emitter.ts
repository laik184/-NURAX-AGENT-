/**
 * shell-log-emitter.ts
 *
 * Streaming spawn wrapper that feeds every stdout/stderr chunk into the
 * console pipeline in real time so users see output as it happens.
 *
 * Responsibilities (single):
 *   Wrap child_process.spawn → captureService.attach → live SSE stream
 *
 * Callers: shell-tools.ts, package-tools.ts
 */

import { spawn, type SpawnOptions } from "child_process";
import { randomUUID } from "crypto";
import { captureService } from "../../../console/capture/capture.service.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreamSpawnOptions {
  command:   string;
  args:      readonly string[];
  cwd:       string;
  projectId: number;
  env?:      NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface StreamSpawnResult {
  exitCode: number | null;
  stdout:   string;
  stderr:   string;
  timedOut: boolean;
}

// ─── Limits ───────────────────────────────────────────────────────────────────

const MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MiB total accumulation cap
const SIGKILL_GRACE_MS = 3_000;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Spawn a process and stream stdout/stderr to the console pipeline in real
 * time via captureService.attach().  Also accumulates output and returns it
 * so callers can send a summary to the LLM when the process exits.
 *
 * Memory safety:
 *  - Accumulated buffer is hard-capped at MAX_BUFFER_BYTES.
 *  - captureService is detached on close/error — no listener leak.
 *  - Timer is always cleared before resolving.
 */
export function spawnWithStream(opts: StreamSpawnOptions): Promise<StreamSpawnResult> {
  const { command, args, cwd, projectId, env, timeoutMs = 30_000 } = opts;
  const processId = randomUUID();

  return new Promise((resolve) => {
    let stdoutBuf   = "";
    let stderrBuf   = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut    = false;
    let settled     = false;

    const spawnOpts: SpawnOptions = {
      cwd,
      env:   env ?? process.env,
      shell: false,
    };

    const child = spawn(command, [...args], spawnOpts);

    // ── Attach to console pipeline (streams live chunks to SSE clients) ──────
    if (child.stdout && child.stderr) {
      captureService.attach({
        processId,
        projectId,
        stdout: child.stdout,
        stderr: child.stderr,
      });
    }

    // ── Accumulate locally for LLM summary ───────────────────────────────────
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes <= MAX_BUFFER_BYTES) stdoutBuf += chunk.toString("utf8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes <= MAX_BUFFER_BYTES) stderrBuf += chunk.toString("utf8");
    });

    // ── Timeout guard ─────────────────────────────────────────────────────────
    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      captureService.injectSystem(projectId, `[TIMEOUT] Process killed after ${timeoutMs}ms`);
      child.kill("SIGTERM");
      setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, SIGKILL_GRACE_MS);
    }, timeoutMs);

    // ── Close ─────────────────────────────────────────────────────────────────
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      captureService.detach(processId);
      resolve({
        exitCode: timedOut ? -1 : code,
        stdout:   stdoutBuf.slice(-20_000),
        stderr:   stderrBuf.slice(-10_000),
        timedOut,
      });
    });

    // ── Spawn error ───────────────────────────────────────────────────────────
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      captureService.detach(processId);
      captureService.injectSystem(projectId, `[ERROR] Spawn failed: ${err.message}`);
      resolve({ exitCode: 1, stdout: "", stderr: err.message, timedOut: false });
    });
  });
}
