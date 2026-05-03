import type { CameraAgentResult, CameraConfig, CameraGenerationInput } from "../types.js";

export function buildCameraConfig(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<CameraConfig>> {
  const resolution = input.preferHighResolution ? "uhd" : "fhd";
  const config: CameraConfig = {
    deviceId: `vision-${input.cameraPosition}-${resolution}`,
    position: input.cameraPosition,
    resolution,
    fps: input.fps,
    bitrateKbps: input.bitrateKbps,
  };

  return Object.freeze({
    success: true,
    logs: Object.freeze(["Camera config built."]),
    data: Object.freeze(config),
  });
}
