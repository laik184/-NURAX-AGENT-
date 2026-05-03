import type { ObserverInput, ObserverOutput, ObservationEvent } from "./types";
import { aggregateSignals } from "./agents/signal-aggregator.agent";
import { detectPatterns } from "./agents/pattern-detector.agent";
import { detectAnomalies } from "./agents/anomaly-detector.agent";
import { analyzeTrends } from "./agents/trend-analyzer.agent";
import { evaluateHealth } from "./agents/health-evaluator.agent";
import { generateInsights } from "./agents/insight-generator.agent";
import { recordObservation } from "./state";

function validateInput(input: ObserverInput): string | null {
  if (!input || !Array.isArray(input.events)) return "events must be an array";
  if (input.events.length === 0) return "events array is empty";
  for (const e of input.events) {
    if (typeof e.module !== "string" || !e.module.trim()) return `event missing module field`;
    if (typeof e.agent !== "string" || !e.agent.trim()) return `event missing agent field`;
    if (e.status !== "success" && e.status !== "fail") return `event status must be 'success' or 'fail', got '${e.status}'`;
    if (typeof e.latency !== "number" || e.latency < 0) return `event latency must be a non-negative number`;
    if (typeof e.timestamp !== "number") return `event timestamp must be a number`;
  }
  return null;
}

export function observe(input: ObserverInput): ObserverOutput {
  const allLogs: string[] = [];

  function fail(message: string): ObserverOutput {
    allLogs.push(`[global-observer] FATAL: ${message}`);
    return { success: false, logs: allLogs, error: message };
  }

  try {
    allLogs.push(`[global-observer] starting observation — ${input?.events?.length ?? 0} event(s)`);

    const validationError = validateInput(input);
    if (validationError) return fail(validationError);

    const events: ObservationEvent[] = input.events.map((e) => ({
      module: e.module.trim(),
      agent: e.agent.trim(),
      status: e.status,
      latency: Math.max(0, e.latency),
      timestamp: e.timestamp,
    }));

    // STEP 1: Aggregate signals per module
    const sigOut = aggregateSignals(events);
    allLogs.push(...sigOut.logs);
    if (!sigOut.success || !sigOut.signals) return fail(sigOut.error ?? "signal aggregation failed");
    const signals = sigOut.signals;

    // STEP 2: Detect patterns
    const patOut = detectPatterns(signals, events);
    allLogs.push(...patOut.logs);
    if (!patOut.success || !patOut.patterns) return fail(patOut.error ?? "pattern detection failed");
    const patterns = patOut.patterns;

    // STEP 3: Detect anomalies
    const anomOut = detectAnomalies(signals, events);
    allLogs.push(...anomOut.logs);
    if (!anomOut.success || !anomOut.anomalies) return fail(anomOut.error ?? "anomaly detection failed");
    const anomalies = anomOut.anomalies;

    // STEP 4: Analyze trends
    const trendOut = analyzeTrends(signals, events);
    allLogs.push(...trendOut.logs);
    if (!trendOut.success || !trendOut.trends) return fail(trendOut.error ?? "trend analysis failed");
    const trends = trendOut.trends;

    // STEP 5: Evaluate health
    const healthOut = evaluateHealth(signals, anomalies, trends);
    allLogs.push(...healthOut.logs);
    if (!healthOut.success || healthOut.healthScore === undefined) return fail(healthOut.error ?? "health evaluation failed");
    const healthScore = healthOut.healthScore;

    // STEP 6: Generate insights
    const insightOut = generateInsights(anomalies, trends, patterns, signals, healthScore);
    allLogs.push(...insightOut.logs);
    if (!insightOut.success || !insightOut.insights) return fail(insightOut.error ?? "insight generation failed");
    const insights = insightOut.insights;

    // Persist to state
    recordObservation(healthScore, anomalies, trends);

    allLogs.push(
      `[global-observer] complete — health=${healthScore} anomalies=${anomalies.length} trends=${trends.length} patterns=${patterns.length} insights=${insights.length}`
    );

    return {
      success: true,
      logs: allLogs,
      data: {
        anomalies,
        trends,
        patterns,
        healthScore,
        insights,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
