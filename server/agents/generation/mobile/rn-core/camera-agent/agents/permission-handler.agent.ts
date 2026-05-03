import type { CameraAgentResult, CameraGenerationInput, PermissionStatus } from "../types.js";

export function handlePermissions(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<{ camera: PermissionStatus; microphone: PermissionStatus }>> {
  const camera: PermissionStatus = "granted";
  const microphone: PermissionStatus = input.feature === "video" && input.includeMicrophone
    ? "granted"
    : "denied";

  if (input.feature === "video" && input.includeMicrophone && microphone !== "granted") {
    return Object.freeze({
      success: false,
      logs: Object.freeze(["Permissions requested.", "Microphone permission unavailable."]),
      error: "Microphone permission denied or blocked.",
    });
  }

  return Object.freeze({
    success: true,
    logs: Object.freeze(["Permissions requested.", "Required permissions granted."]),
    data: Object.freeze({ camera, microphone }),
  });
}
