import type { ErrorReport, FixStrategy, RootCause } from "../types.js";

export function selectFixStrategy(
  detectedErrors: readonly ErrorReport[],
  rootCause: RootCause,
): FixStrategy {
  const primary = detectedErrors[0];

  if (!primary) {
    return Object.freeze({
      action: "NOOP",
      reason: "No errors found to fix.",
      confidence: 0,
    });
  }

  if (primary.kind === "MODULE_NOT_FOUND") {
    return Object.freeze({
      action: "ADD_IMPORT",
      reason: "Module resolution failure suggests missing or incorrect import path.",
      targetFile: rootCause.probableFile,
      confidence: 0.75,
    });
  }

  if (primary.kind === "TYPE" || primary.kind === "SYNTAX") {
    return Object.freeze({
      action: "UPDATE_FILE",
      reason: "Static error indicates a source update is needed.",
      targetFile: rootCause.probableFile,
      confidence: 0.7,
    });
  }

  return Object.freeze({
    action: "UPDATE_FILE",
    reason: "Runtime/build error likely requires safe file-level patch.",
    targetFile: rootCause.probableFile,
    confidence: 0.6,
  });
}
