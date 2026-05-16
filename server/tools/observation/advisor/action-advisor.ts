/**
 * server/tools/observation/advisor/action-advisor.ts
 *
 * Recommends the AI's next action based on the failure class, tool name,
 * and execution history for the current run.
 *
 * Decision matrix:
 *   compile_error    → self_heal  (read the file, fix the error, rebuild)
 *   runtime_crash    → self_heal  (read logs, fix crash, restart)
 *   module_not_found → self_heal  (install the missing package)
 *   port_conflict    → self_heal  (stop the other process or change port)
 *   timeout          → retry      (may be transient — retry once)
 *   network_error    → retry      (transient — retry with backoff)
 *   process_exit     → self_heal  (read stderr, fix the script)
 *   file_not_found   → self_heal  (create the file first)
 *   permission_denied → change_approach
 *   validation_error → self_heal  (fix the arguments)
 *   repeated failure → change_approach (avoid loops)
 */

import type { FailureClass, ActionRecommendation } from "../types.ts";
import type { RunMemorySummary } from "../memory/execution-entry.ts";

const FAILURE_CLASS_MAP: Record<FailureClass, ActionRecommendation> = {
  compile_error:     "self_heal",
  runtime_crash:     "self_heal",
  module_not_found:  "self_heal",
  port_conflict:     "self_heal",
  file_not_found:    "self_heal",
  validation_error:  "self_heal",
  process_exit:      "self_heal",
  timeout:           "retry",
  network_error:     "retry",
  permission_denied: "change_approach",
  unknown_error:     "self_heal",
};

const SELF_HEAL_HINTS: Partial<Record<FailureClass, string>> = {
  compile_error:    "Read the file with the TypeScript error and fix the type issue before rebuilding.",
  runtime_crash:    "Read server logs with server_logs, identify the crash cause, fix the code, then restart.",
  module_not_found: "Use package_install to install the missing module, then retry.",
  port_conflict:    "Call server_stop to free the port, then call server_start again.",
  file_not_found:   "Create the missing file with file_write before retrying.",
  validation_error: "Check the tool parameter schema and correct the arguments.",
  process_exit:     "Read stderr output above and fix the underlying script error.",
};

/**
 * Determine the best action recommendation.
 * Accounts for loop detection and repeated failures.
 */
export function adviseAction(
  failureClass: FailureClass | null,
  memory: RunMemorySummary,
  toolName: string,
): { recommendation: ActionRecommendation; hint: string } {
  // Success path
  if (failureClass === null) {
    return { recommendation: "continue", hint: "" };
  }

  // Loop detection — same pattern failing repeatedly → change approach
  if (memory.loopDetected) {
    return {
      recommendation: "change_approach",
      hint: `This approach has failed multiple times. Try a completely different strategy.`,
    };
  }

  // Too many total failures in one run → abort
  if (memory.failedCalls >= 8) {
    return {
      recommendation: "abort",
      hint: `Run has accumulated ${memory.failedCalls} failures. Report what was tried and stop.`,
    };
  }

  const baseRecommendation = FAILURE_CLASS_MAP[failureClass] ?? "self_heal";
  const hint = SELF_HEAL_HINTS[failureClass] ?? "Analyze the error above and fix the root cause.";

  return { recommendation: baseRecommendation, hint };
}
