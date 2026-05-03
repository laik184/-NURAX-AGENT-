import type { CameraAgentResult, CameraGenerationInput } from "../types.js";

export function captureVideo(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<{ recordingId: string; fps: number; bitrateKbps: number; hasAudio: boolean }>> {
  return Object.freeze({
    success: true,
    logs: Object.freeze(["Recording started.", "Recording stopped."]),
    data: Object.freeze({
      recordingId: `video-${input.cameraPosition}-${input.fps}`,
      fps: input.fps,
      bitrateKbps: input.bitrateKbps,
      hasAudio: input.includeMicrophone,
    }),
  });
}
