import type { ErrorReport, RootCause } from "../types.js";

function buildEvidence(error: ErrorReport): readonly string[] {
  const evidence: string[] = [];
  if (error.filePath) evidence.push(`File reference found: ${error.filePath}`);
  if (error.line) evidence.push(`Line number available: ${error.line}`);
  evidence.push(`Error kind: ${error.kind}`);
  return Object.freeze(evidence);
}

export function analyzeRootCause(detectedErrors: readonly ErrorReport[]): RootCause {
  const primary = detectedErrors[0];

  if (!primary) {
    return Object.freeze({
      summary: "No error report available.",
      confidence: 0,
      evidence: Object.freeze(["Detector returned no errors."]),
    });
  }

  const summary = primary.filePath
    ? `Likely failure in ${primary.filePath} triggered by: ${primary.message}`
    : `Likely root cause inferred from message: ${primary.message}`;

  return Object.freeze({
    summary,
    probableFile: primary.filePath,
    confidence: primary.filePath ? 0.88 : 0.55,
    evidence: buildEvidence(primary),
  });
}
