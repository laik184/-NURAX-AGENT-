import type { CameraAgentResult, CameraConfig, CameraGenerationInput } from "../types.js";

export function setupCamera(
  input: CameraGenerationInput,
  config: CameraConfig,
): Readonly<CameraAgentResult<CameraConfig>> {
  const logs = [
    `Initializing react-native-vision-camera for ${input.cameraPosition} camera.`,
    `Resolution set to ${config.resolution}.`,
  ];

  return Object.freeze({
    success: true,
    logs: Object.freeze(logs),
    data: Object.freeze({ ...config }),
  });
}
