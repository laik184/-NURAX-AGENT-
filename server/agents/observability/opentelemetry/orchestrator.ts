import { exportTelemetry } from "./agents/exporter.agent.js";
import { extractContext, injectContext } from "./agents/context-propagation.agent.js";
import { trackError } from "./agents/error-tracker.agent.js";
import { collectMetrics } from "./agents/metrics-collector.agent.js";
import { createSpan, closeSpan } from "./agents/span-builder.agent.js";
import { startTrace, endTrace } from "./agents/tracer.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  ExporterConfig,
  Span,
  TelemetryResult,
  TelemetryState,
  TraceContext,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

export type {
  CreateSpanInput,
  CloseSpanInput,
} from "./agents/span-builder.agent.js";

export type {
  StartTraceInput,
  EndTraceInput,
} from "./agents/tracer.agent.js";

export type {
  CollectMetricsInput,
} from "./agents/metrics-collector.agent.js";

export type {
  TrackErrorInput,
} from "./agents/error-tracker.agent.js";

export type {
  InjectContextInput,
  ExtractContextInput,
} from "./agents/context-propagation.agent.js";

export type {
  ExportInput,
} from "./agents/exporter.agent.js";

const SOURCE = "orchestrator";

export interface TraceSessionInput {
  readonly service: string;
  readonly rootSpanName: string;
  readonly attributes?: Record<string, unknown>;
  readonly incomingHeaders?: Record<string, string>;
  readonly exporterConfig?: Readonly<ExporterConfig>;
  readonly errorToTrack?: Error;
  readonly totalRequests?: number;
  readonly errorCount?: number;
}

function fail(
  state: Readonly<TelemetryState>,
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
    output: Object.freeze<TelemetryResult>({
      success: false,
      traceId: "",
      spans: Object.freeze([]),
      metrics: Object.freeze([]),
      logs: nextState.logs,
      error,
    }),
  };
}

export async function runTraceSessionOrchestrator(
  input: TraceSessionInput,
  currentState: Readonly<TelemetryState> = INITIAL_STATE,
): Promise<Readonly<AgentResult>> {
  let state = currentState;

  try {
    // Step 1: Extract incoming trace context (if any)
    let parentContext: Readonly<TraceContext> | null = null;
    if (input.incomingHeaders) {
      const ctxResult = extractContext(state, { headers: input.incomingHeaders });
      state = ctxResult.nextState;
      parentContext = ctxResult.context;
    }

    // Step 2: Start the trace
    const traceResult = startTrace(state, {
      service: input.service,
      rootSpanName: input.rootSpanName,
    });
    state = traceResult.nextState;
    const { traceId, rootSpanId } = traceResult.trace;

    // Step 3: Create the root span (child of incoming context if present)
    const spanResult = createSpan(state, {
      traceId,
      name: input.rootSpanName,
      parentSpanId: parentContext?.spanId,
      attributes: input.attributes,
    });
    state = spanResult.nextState;
    const rootSpan = spanResult.span;

    // Step 4: Propagate outgoing context via headers
    const outgoingContext: Readonly<TraceContext> = Object.freeze({
      traceId,
      spanId: rootSpan.spanId,
      sampled: true,
    });
    const injectResult = injectContext(state, { context: outgoingContext });
    state = injectResult.nextState;

    // Step 5: Track error if provided
    let trackedSpan: Readonly<Span> = rootSpan;
    if (input.errorToTrack) {
      const errResult = trackError(state, {
        error: input.errorToTrack,
        traceId,
        spanId: rootSpan.spanId,
        tags: { service: input.service },
      });
      state = errResult.nextState;
      trackedSpan = errResult.updatedSpan;
    }

    // Step 6: Close the root span
    const closeResult = closeSpan(state, {
      spanId: rootSpan.spanId,
      traceId,
      error: input.errorToTrack,
    });
    state = closeResult.nextState;

    // Step 7: Collect metrics from all spans in this trace
    const traceSpans = state.spans.filter((s) => s.traceId === traceId);
    const metricsResult = collectMetrics(state, {
      traceId,
      spans: traceSpans,
      service: input.service,
      totalRequests: input.totalRequests,
      errorCount: input.errorCount,
    });
    state = metricsResult.nextState;

    // Step 8: End the trace
    const endResult = endTrace(state, { traceId });
    state = endResult.nextState;

    // Step 9: Export telemetry
    const exporterConfig: Readonly<ExporterConfig> = input.exporterConfig ??
      Object.freeze({
        target: "console",
        serviceName: input.service,
      });

    const exportResult = await exportTelemetry(state, {
      traceId,
      spans: traceSpans,
      metrics: metricsResult.metrics,
      config: exporterConfig,
    });
    state = exportResult.nextState;

    const finalLog = buildLog(
      SOURCE,
      `Trace session complete: traceId=${traceId} spans=${traceSpans.length} metrics=${metricsResult.metrics.length} exported=${exportResult.exported}`,
    );
    state = transitionState(state, { appendLog: finalLog });

    const output: Readonly<TelemetryResult> = Object.freeze({
      success: true,
      traceId,
      spans: Object.freeze([...traceSpans]),
      metrics: metricsResult.metrics,
      logs: state.logs,
    });

    return Object.freeze({ nextState: state, output });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unexpected orchestrator error";
    return fail(state, message, `Trace session failed: ${message}`);
  }
}

export {
  startTrace,
  endTrace,
  createSpan,
  closeSpan,
  collectMetrics,
  trackError,
  injectContext,
  extractContext,
  exportTelemetry,
};
