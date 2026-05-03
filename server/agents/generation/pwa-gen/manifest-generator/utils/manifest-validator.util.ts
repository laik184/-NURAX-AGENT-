import type { InstallableManifest, ManifestInput } from "../types.js";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function isValidColor(color: string): boolean {
  return HEX_COLOR_PATTERN.test(color);
}

export function sanitizeColor(color: string, fallback: string): string {
  return isValidColor(color) ? color : fallback;
}

export function validateManifestInput(input: Readonly<ManifestInput>): string[] {
  const errors: string[] = [];

  if (!input.appName.trim()) {
    errors.push("appName is required.");
  }

  if (!input.shortName.trim()) {
    errors.push("shortName is required.");
  }

  if (!input.startUrl.trim()) {
    errors.push("startUrl is required.");
  }

  return errors;
}

export function validateManifest(manifest: Readonly<InstallableManifest>): string[] {
  const errors: string[] = [];

  if (!manifest.name.trim()) {
    errors.push("Manifest name is missing.");
  }

  if (!manifest.short_name.trim()) {
    errors.push("Manifest short_name is missing.");
  }

  if (!manifest.start_url.trim()) {
    errors.push("Manifest start_url is missing.");
  }

  if (!manifest.icons.length) {
    errors.push("Manifest icons are missing.");
  }

  if (!manifest.theme_color || !manifest.background_color) {
    errors.push("Manifest theme/background color is missing.");
  }

  return errors;
}
