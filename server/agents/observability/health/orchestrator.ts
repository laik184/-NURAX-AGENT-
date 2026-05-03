import {
  buildHealthEndpointResponse,
  buildLivenessEndpointResponse,
  buildReadinessEndpointResponse,
} from "./agents/healthcheck-endpoint.agent.js";
import { runDependencyCheck } from "./agents/dependency-check.agent.js";
import { runLivenessCheck } from "./agents/liveness-check.agent.js";
import { runReadinessCheck } from "./agents/readiness-check.agent.js";
import {
  aggregateHealthStatus,
  aggregateLivenessStatus,
  aggregateReadinessStatus,
} from "./agents/status-aggregator.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  DependencyChecker,
  HealthResponse,
  HealthState,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

export type {
  EndpointRequest,
  EndpointResponse,
  EndpointOptions,
} from "./agents/healthcheck-endpoint.agent.js";

export type { ReadinessCheckInput } from "./agents/readiness-check.agent.js";
export type { DependencyCheckInput } from "./agents/dependency-check.agent.js";

const SOURCE = "orchestrator";

export interface HealthCheckOptions {
  readonly dependencies?: readonly DependencyChecker[];
  readonly isInitialized?: boolean;
  readonly configLoaded?: boolean;
  readonly timeoutMs?: number;
}

function fail(
  state: Readonly<HealthState>,
  message: string,
): Readonly<AgentResult> {
  const err = buildError(SOURCE, message);
  const log = buildLog(SOURCE, message);
  const nextState = transitionState(state, {
    status: "DOWN",
    appendError: err,
    appendLog: log,
  });

  const output: Readonly<HealthResponse> = Object.freeze({
    success: false,
    status: "DOWN",
    checks: Object.freeze([]),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    logs: nextState.logs,
    error: message,
  });

  return Object.freeze({ nextState, output });
}

export async function runFullHealthCheck(
  options: HealthCheckOptions = {},
  currentState: Readonly<HealthState> = INITIAL_STATE,
): Promise<Readonly<AgentResult>> {
  let state = currentState;

  try {
    // Step 1: Liveness check
    const livenessResult = runLivenessCheck(state);
    state = livenessResult.nextState;

    // Step 2: Readiness check
    const readinessResult = runReadinessCheck(state, {
      isInitialized: options.isInitialized,
      configLoaded: options.configLoaded,
    });
    state = readinessResult.nextState;

    // Step 3: Dependency check
    const dependencyResult = await runDependencyCheck(state, {
      dependencies: options.dependencies ?? [],
      timeoutMs: options.timeoutMs,
    });
    state = dependencyResult.nextState;

    // Step 4: Aggregate all results
    const aggregate = aggregateHealthStatus(state, {
      livenessChecks: livenessResult.result.checks,
      readinessChecks: readinessResult.result.checks,
      dependencyChecks: dependencyResult.result.checks,
    });
    state = aggregate.nextState;

    const finalLog = buildLog(
      SOURCE,
      `Full health check complete: status=${aggregate.status} checks=${aggregate.response.checks.length}`,
    );
    state = transitionState(state, { appendLog: finalLog });

    return Object.freeze({ nextState: state, output: aggregate.response });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected health check error";
    return fail(state, `Health check failed: ${message}`);
  }
}

export async function runLivenessOrchestrator(
  currentState: Readonly<HealthState> = INITIAL_STATE,
): Promise<Readonly<AgentResult>> {
  let state = currentState;

  try {
    // Step 1: Run liveness check
    const livenessResult = runLivenessCheck(state);
    state = livenessResult.nextState;

    // Step 2: Aggregate liveness-only
    const aggregate = aggregateLivenessStatus(state, livenessResult.result.checks);
    state = aggregate.nextState;

    return Object.freeze({ nextState: state, output: aggregate.response });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Liveness check error";
    return fail(state, message);
  }
}

export async function runReadinessOrchestrator(
  options: Pick<HealthCheckOptions, "isInitialized" | "configLoaded" | "dependencies" | "timeoutMs"> = {},
  currentState: Readonly<HealthState> = INITIAL_STATE,
): Promise<Readonly<AgentResult>> {
  let state = currentState;

  try {
    // Step 1: Readiness check
    const readinessResult = runReadinessCheck(state, {
      isInitialized: options.isInitialized,
      configLoaded: options.configLoaded,
    });
    state = readinessResult.nextState;

    // Step 2: Dependency check (lightweight, if configured)
    const dependencyResult = await runDependencyCheck(state, {
      dependencies: options.dependencies ?? [],
      timeoutMs: options.timeoutMs,
    });
    state = dependencyResult.nextState;

    // Step 3: Aggregate readiness + dependency
    const allChecks = [
      ...readinessResult.result.checks,
      ...dependencyResult.result.checks,
    ];
    const aggregate = aggregateReadinessStatus(state, allChecks);
    state = aggregate.nextState;

    return Object.freeze({ nextState: state, output: aggregate.response });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Readiness check error";
    return fail(state, message);
  }
}

export {
  buildHealthEndpointResponse,
  buildLivenessEndpointResponse,
  buildReadinessEndpointResponse,
  runLivenessCheck,
  runReadinessCheck,
  runDependencyCheck,
  aggregateHealthStatus,
};
