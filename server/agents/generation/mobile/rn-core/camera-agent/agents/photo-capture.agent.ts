import type { CameraAgentResult, CameraGenerationInput } from "../types.js";

export function capturePhoto(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<{ assetId: string; flash: string; focusMode: "auto"; quality: number }>> {
  return Object.freeze({
    success: true,
    logs: Object.freeze(["Photo capture requested.", "Photo captured deterministically."]),
    data: Object.freeze({
      assetId: `photo-${input.cameraPosition}-${input.quality}`,
      flash: input.flash,
      focusMode: "auto",
      quality: input.quality,
    }),
  });
}
