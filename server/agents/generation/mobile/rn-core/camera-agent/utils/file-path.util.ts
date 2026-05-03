import type { CameraAgentResult, CameraFeature } from "../types.js";

const FEATURE_EXTENSION: Record<CameraFeature, "jpg" | "mp4" | "png"> = {
  photo: "jpg",
  video: "mp4",
  gallery: "png",
  qr: "png",
};

export function buildSafeFilePath(
  feature: CameraFeature,
  seed: string,
): Readonly<CameraAgentResult<{ path: string; format: "jpg" | "mp4" | "png" }>> {
  const sanitized = seed.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 24) || "media";
  const format = FEATURE_EXTENSION[feature];
  const path = `/tmp/camera-agent/${feature}-${sanitized}.${format}`;

  return Object.freeze({
    success: true,
    logs: Object.freeze([`File path created for ${feature}.`]),
    data: Object.freeze({ path, format }),
  });
}
