import type { InstallableManifest, ManifestInput } from "../types.js";

export function buildBaseManifest(input: Readonly<ManifestInput>): InstallableManifest {
  return Object.freeze({
    name: input.appName,
    short_name: input.shortName,
    start_url: input.startUrl,
    display: input.display,
    theme_color: input.themeColor,
    background_color: input.backgroundColor,
    orientation: input.orientation,
    icons: [],
    shortcuts: [],
    screenshots: [],
  });
}
