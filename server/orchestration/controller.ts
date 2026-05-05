import { db } from "../infrastructure/db/index.ts";
import { agentRuns } from "../../shared/schema.ts";
import { bus } from "../infrastructure/events/bus.ts";
import { executeToolLoopRun } from "./agent-loop-runner.ts";
import { executePipelineRun } from "./pipeline-runner.ts";
import { attachAgentEventPersister } from "./event-persist.ts";
import { getRun, newRunId, registerRun, requestCancel } from "./runs.ts";
import type { RunHandle, RunInput } from "./types.ts";

class OrchestrationController {
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

    // Fire-and-forget execution; client subscribes via WS/SSE for progress.
    void this.executeAsync(handle, input);

    return handle;
  }

  private async executeAsync(handle: RunHandle, input: RunInput): Promise<void> {
    // Default path: real LLM tool-calling agent loop. The legacy pipeline path
    // is kept under mode === "pipeline" for fallback / benchmarking.
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

export const orchestrator = new OrchestrationController();

// Attach the single global agent.event → DB persister.
attachAgentEventPersister();
