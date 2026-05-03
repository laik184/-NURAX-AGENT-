import { mapIconSizes } from "../utils/icon-size-mapper.util.js";
import type { ManifestIcon } from "../types.js";

const DEFAULT_ICON_PREFIX = "/icons/icon";

function normalizeBasePath(iconPath?: string): string {
  const candidate = iconPath && iconPath.trim().length > 0 ? iconPath.trim() : DEFAULT_ICON_PREFIX;
  return candidate.endsWith(".png") ? candidate.slice(0, -4) : candidate;
}

export function generateIconConfig(icons: readonly string[] | undefined): ManifestIcon[] {
  const primaryIconPath = icons && icons.length > 0 ? icons[0] : undefined;
  const basePath = normalizeBasePath(primaryIconPath);

  const iconSet = mapIconSizes().flatMap((size) => {
    const [width] = size.split("x");
    const src = `${basePath}-${width}.png`;

    return [
      Object.freeze({ src, sizes: size, type: "image/png" as const, purpose: "any" as const }),
      Object.freeze({ src, sizes: size, type: "image/png" as const, purpose: "maskable" as const }),
    ];
  });

  return iconSet;
}
