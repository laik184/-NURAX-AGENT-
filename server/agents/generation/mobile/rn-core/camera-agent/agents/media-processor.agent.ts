import type { CameraAgentResult, CameraFeature } from "../types.js";
import { buildSafeFilePath } from "../utils/file-path.util.js";

export function processMedia(
  feature: CameraFeature,
  seed: string,
): Readonly<CameraAgentResult<{ outputPath: string; format: "jpg" | "mp4" | "png"; sizeKb: number }>> {
  const filePathResult = buildSafeFilePath(feature, seed);
  if (!filePathResult.success || !filePathResult.data) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(["Media processing started.", ...filePathResult.logs]),
      error: filePathResult.error ?? "Unable to build output file path.",
    });
  }

  const sizeKb = feature === "video" ? 2048 : 512;

  return Object.freeze({
    success: true,
    logs: Object.freeze(["Media processing started.", "Media processing finished."]),
    data: Object.freeze({
      outputPath: filePathResult.data.path,
      format: filePathResult.data.format,
      sizeKb,
    }),
  });
}
