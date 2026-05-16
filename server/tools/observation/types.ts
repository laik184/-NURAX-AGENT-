/**
 * server/tools/observation/types.ts
 *
 * Canonical types for the Observable Execution Engine.
 * Every tool execution produces an ExecutionObservation that is injected
 * back into the LLM context so the AI can reason about what happened.
 */

// ── Failure classification ─────────────────────────────────────────────────────

export type FailureClass =
  | "compile_error"       // TypeScript / Babel / tsc errors
  | "runtime_crash"       // server crashed after start/restart
  | "process_exit"        // non-zero exit code from shell command
  | "module_not_found"    // Cannot find module / missing package
  | "port_conflict"       // EADDRINUSE — port already in use
  | "network_error"       // fetch/curl failed, ECONNREFUSED
  | "permission_denied"   // EACCES / permission error
  | "timeout"             // tool exceeded time limit
  | "validation_error"    // args schema failed
  | "file_not_found"      // ENOENT — file does not exist
  | "unknown_error";      // catch-all

// ── Recommendation for AI next action ────────────────────────────────────────

export type ActionRecommendation =
  | "continue"      // success — proceed with the plan
  | "retry"         // transient failure — safe to retry same tool
  | "self_heal"     // error in code — AI must read + fix before retrying
  | "change_approach" // repeated failure — try a different strategy
  | "abort";        // unrecoverable — stop the run

// ── Runtime health snapshot ───────────────────────────────────────────────────

export interface RuntimeHealth {
  running: boolean;
  port:    number | null;
  uptimeMs: number | null;
  status:  string;
}

// ── The observation produced after every tool execution ───────────────────────

export interface ExecutionObservation {
  toolName:        string;
  ok:              boolean;
  failureClass:    FailureClass | null;
  durationMs:      number;
  consoleLines:    string[];          // stderr/stdout captured after tool started
  errorLines:      string[];          // filtered: only error/warning lines
  runtimeHealth:   RuntimeHealth | null;
  recommendation:  ActionRecommendation;
  contextBlock:    string;            // injected into LLM messages
  ts:              number;
}

// ── Observation event emitted to the bus ─────────────────────────────────────

export interface ToolObservationEvent {
  runId:       string;
  projectId:   number;
  observation: ExecutionObservation;
  ts:          number;
}
