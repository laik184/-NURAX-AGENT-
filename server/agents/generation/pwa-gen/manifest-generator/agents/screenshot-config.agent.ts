import type { ManifestScreenshot } from "../types.js";

export function generateScreenshotConfig(): ManifestScreenshot[] {
  return [
    Object.freeze({
      src: "/screenshots/home-narrow.png",
      sizes: "540x720",
      type: "image/png" as const,
      form_factor: "narrow" as const,
      label: "Home screen mobile view",
    }),
    Object.freeze({
      src: "/screenshots/home-wide.png",
      sizes: "1280x720",
      type: "image/png" as const,
      form_factor: "wide" as const,
      label: "Home screen desktop view",
    }),
  ];
}
