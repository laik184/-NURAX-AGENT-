import { db } from "../../infrastructure/db/index.ts";
import { agentRuns } from "../../../shared/schema.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import { executeToolLoopRun } from "./tool-loop-runner.ts";
import { executePipelineRun } from "./runner.ts";
import { attachAgentEventPersister } from "./event-persist.ts";
import { getRun, newRunId, registerRun, requestCancel } from "./runs.ts";
import type { RunHandle, RunInput } from "./types.ts";

class PipelineController {
  async runGoal(input: RunInput): Promise<RunHandle> {
    const runId = newRunId();
    const handle: RunHandle = {
      runId,
      projectId: input.projectId,
      status: "running",
      startedAt: Date.now(),
    };
    registerRun(handle);

    await db.insert(agentRuns).values({
      id: runId,
      projectId: input.projectId,
      goal: input.goal,
      status: "running",
    });

    bus.emit("run.lifecycle", {
      runId,
      projectId: input.projectId,
      status: "started",
      ts: Date.now(),
    });

    void this.executeAsync(handle, input);

    return handle;
  }

  private async executeAsync(handle: RunHandle, input: RunInput): Promise<void> {
    const useToolLoop = (input.mode ?? "agent") !== "pipeline";
    if (useToolLoop) return executeToolLoopRun(handle, input);
    return executePipelineRun(handle, input);
  }

  cancel(runId: string): boolean {
    return requestCancel(runId);
  }

  get(runId: string): RunHandle | undefined {
    return getRun(runId);
  }
}

export const pipeline = new PipelineController();

attachAgentEventPersister();
