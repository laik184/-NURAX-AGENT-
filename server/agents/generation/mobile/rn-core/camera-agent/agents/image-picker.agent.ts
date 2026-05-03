import type { CameraAgentResult, CameraGenerationInput } from "../types.js";

export function pickImageFromGallery(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<{ sourcePath: string; valid: boolean }>> {
  const sourcePath = input.sourcePath ?? "/gallery/default.png";
  const valid = sourcePath.endsWith(".png") || sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg");

  if (!valid) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(["Gallery selection attempted."]),
      error: "Unsupported gallery file format.",
    });
  }

  return Object.freeze({
    success: true,
    logs: Object.freeze(["Gallery selection attempted.", "Gallery image selected."]),
    data: Object.freeze({ sourcePath, valid }),
  });
}
