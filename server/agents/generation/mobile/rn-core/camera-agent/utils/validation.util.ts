import type { CameraAgentResult, CameraGenerationInput } from "../types.js";

export function validateCameraInput(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<{ valid: true }>> {
  const logs = ["Validating camera input."];

  if (input.fps < 1 || input.fps > 120) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(logs),
      error: "fps must be between 1 and 120.",
    });
  }

  if (input.bitrateKbps < 128 || input.bitrateKbps > 100000) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(logs),
      error: "bitrateKbps must be between 128 and 100000.",
    });
  }

  if (input.quality < 1 || input.quality > 100) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(logs),
      error: "quality must be between 1 and 100.",
    });
  }

  return Object.freeze({
    success: true,
    logs: Object.freeze([...logs, "Input is valid."]),
    data: Object.freeze({ valid: true }),
  });
}
