/**
 * server/runtime/index.ts
 *
 * Public API for the runtime observation layer.
 *
 * All external consumers (routes, tools, main.ts) import ONLY from here.
 * Internal modules (observer/, health/, verification/, feedback/, controllers/)
 * are implementation details and must not be imported directly by callers
 * outside server/runtime/.
 */

export { logBuffer }               from "./observer/log-buffer.ts";
export { analyzeLines }            from "./observer/log-analyzer.ts";
export { detectStartup }           from "./observer/startup-detector.ts";
export { probePort, probePortWithRetry } from "./health/port-probe.ts";
export { checkPreviewHealth }      from "./health/preview-health.ts";
export { verifyStartup }           from "./verification/startup-verifier.ts";
export { emitVerificationResult, emitObservationSnapshot } from "./feedback/feedback-emitter.ts";
export { observationController }   from "./controllers/observation-controller.ts";

export type { VerificationResult, VerificationOutcome } from "./verification/verification-types.ts";
export type { AnalysisResult, DetectedError, ErrorClass } from "./observer/log-analyzer.ts";
export type { StartupDetectionResult, StartupOutcome }   from "./observer/startup-detector.ts";
export type { ProbeResult }                              from "./health/port-probe.ts";
export type { PreviewHealthResult }                      from "./health/preview-health.ts";
