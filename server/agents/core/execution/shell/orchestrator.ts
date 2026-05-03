import { validateCommand } from "./agents/command-validator.agent.js";
import { handleExitCode } from "./agents/exit-code-handler.agent.js";
import { monitorProcess } from "./agents/process-monitor.agent.js";
import { executeCommand } from "./agents/shell-executor.agent.js";
import { createTimeoutController } from "./agents/timeout-controller.agent.js";
import { applyStatePatch, createInitialState } from "./state.js";
import type { CommandInput, CommandResult } from "./types.js";
import { normalizeError } from "./utils/error-normalizer.util.js";
import { logLine } from "./utils/logger.util.js";

export async function runCommand(input: Readonly<CommandInput>): Promise<Readonly<CommandResult>> {
  const validated = validateCommand(input);
  const execution = executeCommand(validated);

  let state = createInitialState(execution.processInfo.processId, execution.processInfo.command);
  state = applyStatePatch(state, {
    status: "RUNNING",
    appendLogs: [logLine("orchestrator", `validated and started pid=${execution.processInfo.pid}`)],
  });

  const timeoutController = createTimeoutController(execution.process, validated.timeoutMs);

  try {
    const [monitorOutput, timedOut] = await Promise.all([
      monitorProcess(execution.process),
      timeoutController.timeoutFired,
    ]);

    timeoutController.cancel();

    const finalStatus = timedOut
      ? "TIMEOUT"
      : monitorOutput.exitCode === 0
        ? "SUCCESS"
        : "FAILED";

    state = applyStatePatch(state, {
      status: finalStatus,
      appendStdout: monitorOutput.stdout,
      appendStderr: monitorOutput.stderr,
      appendLogs: [logLine("orchestrator", `process completed with code=${monitorOutput.exitCode ?? "null"}`)],
      appendErrors: timedOut ? ["Execution timed out"] : [],
    });

    return handleExitCode({
      exitCode: monitorOutput.exitCode,
      timedOut,
      stdout: state.stdout,
      stderr: state.stderr,
      logs: state.logs,
      normalizedError: state.errors[0],
    });
  } catch (error) {
    timeoutController.cancel();
    const normalized = normalizeError(error);

    state = applyStatePatch(state, {
      status: "FAILED",
      appendErrors: [normalized],
      appendLogs: [logLine("orchestrator", `execution error: ${normalized}`)],
    });

    return handleExitCode({
      exitCode: 1,
      timedOut: false,
      stdout: state.stdout,
      stderr: state.stderr,
      logs: state.logs,
      normalizedError: normalized,
    });
  }
}
