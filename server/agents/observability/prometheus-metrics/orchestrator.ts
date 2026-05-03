import { aggregateMetrics } from "./agents/metrics-collector.agent.js";
import { defineCustomMetric, incrementCustomCounter, observeCustomHistogram, setCustomGauge } from "./agents/custom-metrics.agent.js";
import { recordHttpRequest, incrementInFlight } from "./agents/http-metrics.agent.js";
import { initRegistry, registerMetric, renderExpositon, removeMetric } from "./agents/registry-manager.agent.js";
import { collectSystemMetrics } from "./agents/system-metrics.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  MetricConfig,
  PrometheusOutput,
  PrometheusState,
  RegistryConfig,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

export type { RecordHttpRequestInput } from "./agents/http-metrics.agent.js";
export type {
  IncrementCounterInput,
  SetGaugeInput,
  ObserveHistogramInput,
} from "./agents/custom-metrics.agent.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<PrometheusState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  const nextState = transitionState(state, {
    status: "FAILED",
    appendError: buildError(SOURCE, message),
    appendLog: buildLog(SOURCE, message),
  });

  return {
    nextState,
    output: Object.freeze<PrometheusOutput>({
      success: false,
      metricsCount: 0,
      endpoint: "/metrics",
      exposition: "",
      logs: nextState.logs,
      error,
    }),
  };
}

export async function initMetricsOrchestrator(
  registryConfig: Readonly<RegistryConfig> = {},
  currentState: Readonly<PrometheusState> = INITIAL_STATE,
): Promise<Readonly<AgentResult>> {
  let state = currentState;

  try {
    // Step 1: Init registry
    const registryResult = initRegistry(state, registryConfig);
    state = registryResult.nextState;

    // Step 2: Collect system metrics
    const systemResult = await collectSystemMetrics(state);
    state = systemResult.nextState;

    // Step 3: HTTP metrics slot already in place (populated via recordHttpRequest calls)
    const httpLog = buildLog(SOURCE, "HTTP metrics transport attached");
    state = transitionState(state, { appendLog: httpLog });

    // Step 4: Custom metrics slot ready (populated via custom-metrics agent)
    const customLog = buildLog(SOURCE, "Custom metrics transport attached");
    state = transitionState(state, { appendLog: customLog });

    // Step 5: Register default metric descriptors in registry
    const defaultConfigs: MetricConfig[] = [
      { name: "process_memory_bytes", type: "gauge", help: "Node.js process memory usage in bytes" },
      { name: "process_uptime_seconds", type: "counter", help: "Total process uptime in seconds" },
      { name: "nodejs_heap_size_used_bytes", type: "gauge", help: "Node.js heap size used in bytes" },
      { name: "nodejs_heap_size_total_bytes", type: "gauge", help: "Node.js heap size total in bytes" },
      { name: "nodejs_external_memory_bytes", type: "gauge", help: "Node.js external memory usage in bytes" },
      { name: "nodejs_eventloop_lag_seconds", type: "gauge", help: "Approximated event loop lag in seconds" },
      { name: "http_requests_total", type: "counter", help: "Total HTTP requests, by method, route, and status" },
      { name: "http_request_duration_seconds", type: "histogram", help: "HTTP request duration in seconds" },
      { name: "http_requests_in_flight", type: "gauge", help: "Current number of HTTP requests in flight" },
    ];

    for (const cfg of defaultConfigs) {
      const r = registerMetric(state, cfg);
      state = r.nextState;
    }

    // Step 6: Aggregate all collected metrics and render exposition
    const aggregate = aggregateMetrics(state);
    state = aggregate.nextState;

    // Step 7: Final render and expose endpoint
    const renderResult = renderExpositon(state);
    state = renderResult.nextState;

    const finalLog = buildLog(
      SOURCE,
      `Metrics initialized: ${renderResult.metricsCount} metrics ready on /metrics`,
    );
    state = transitionState(state, { appendLog: finalLog });

    const output: Readonly<PrometheusOutput> = Object.freeze({
      success: true,
      metricsCount: renderResult.metricsCount,
      endpoint: "/metrics",
      exposition: renderResult.exposition,
      logs: state.logs,
    });

    return Object.freeze({ nextState: state, output });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown initialization error";
    return fail(state, message, `Metrics init failed: ${message}`);
  }
}

export async function scrapeMetricsOrchestrator(
  currentState: Readonly<PrometheusState>,
): Promise<Readonly<{ nextState: Readonly<PrometheusState>; exposition: string; metricsCount: number }>> {
  const systemResult = await collectSystemMetrics(currentState);
  const renderResult = renderExpositon(systemResult.nextState);

  return {
    nextState: renderResult.nextState,
    exposition: renderResult.exposition,
    metricsCount: renderResult.metricsCount,
  };
}

export {
  recordHttpRequest,
  incrementInFlight,
  incrementCustomCounter,
  setCustomGauge,
  observeCustomHistogram,
  defineCustomMetric,
  registerMetric,
  removeMetric,
  renderExpositon,
  aggregateMetrics,
};
