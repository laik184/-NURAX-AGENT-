import type { ManifestShortcut } from "../types.js";

export function generateShortcuts(appName: string): ManifestShortcut[] {
  const normalizedName = appName.trim();

  return [
    Object.freeze({
      name: "Open Dashboard",
      short_name: "Dashboard",
      url: "/dashboard",
      icons: [
        Object.freeze({
          src: "/icons/shortcut-dashboard-192.png",
          sizes: "192x192",
          type: "image/png" as const,
          purpose: "any" as const,
        }),
      ],
    }),
    Object.freeze({
      name: `Open ${normalizedName}`,
      short_name: normalizedName,
      url: "/",
      icons: [
        Object.freeze({
          src: "/icons/shortcut-home-192.png",
          sizes: "192x192",
          type: "image/png" as const,
          purpose: "any" as const,
        }),
      ],
    }),
  ];
}
