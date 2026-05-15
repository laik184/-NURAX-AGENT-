import type { AppRuntimeStatus, RuntimeStatus } from "../../types.ts";
import { metricsCollector } from "../resources/metrics-collector.ts";

interface RuntimeState {
  appStatus: AppRuntimeStatus;
  lastDeployed: number | null;
  startedAt: number | null;
  pendingAction: string | null;
  timer: ReturnType<typeof setTimeout> | null;
}

class RuntimeStatusService {
  private states = new Map<number, RuntimeState>();

  private getState(deploymentId: number): RuntimeState {
    if (!this.states.has(deploymentId)) {
      this.states.set(deploymentId, {
        appStatus: "stopped",
        lastDeployed: null,
        startedAt: null,
        pendingAction: null,
        timer: null,
      });
    }
    return this.states.get(deploymentId)!;
  }

  markLive(deploymentId: number): void {
    const state = this.getState(deploymentId);
    state.appStatus = "running";
    state.lastDeployed = Date.now();
    state.startedAt = Date.now();
  }

  getStatus(deploymentId: number): RuntimeStatus {
    const state = this.getState(deploymentId);
    const { cpu, mem } = metricsCollector.getCurrentStats(deploymentId);
    const uptime = state.startedAt && state.appStatus === "running"
      ? Math.floor((Date.now() - state.startedAt) / 1000)
      : 0;
    return {
      appStatus: state.appStatus,
      uptime,
      lastDeployed: state.lastDeployed,
      cpuPct: cpu,
      memMb: mem,
    };
  }

  restart(deploymentId: number): void {
    const state = this.getState(deploymentId);
    if (state.pendingAction) return;
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.appStatus = "restarting";
    state.pendingAction = "restart";
    state.timer = setTimeout(() => {
      state.appStatus = "running";
      state.startedAt = Date.now();
      state.pendingAction = null;
      state.timer = null;
    }, 3000);
  }

  redeploy(deploymentId: number): void {
    const state = this.getState(deploymentId);
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.appStatus = "restarting";
    state.pendingAction = "redeploy";
    state.timer = setTimeout(() => {
      state.appStatus = "running";
      state.startedAt = Date.now();
      state.lastDeployed = Date.now();
      state.pendingAction = null;
      state.timer = null;
    }, 4500);
  }

  shutdown(deploymentId: number): void {
    const state = this.getState(deploymentId);
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.appStatus = "restarting";
    state.pendingAction = "shutdown";
    metricsCollector.stopTracking(deploymentId);
    state.timer = setTimeout(() => {
      state.appStatus = "stopped";
      state.startedAt = null;
      state.pendingAction = null;
      state.timer = null;
    }, 2000);
  }
}

export const runtimeStatus = new RuntimeStatusService();
