export interface ManifestInput {
  appName: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  startUrl: string;
  display: "standalone" | "fullscreen" | "minimal-ui";
  orientation?: "portrait" | "landscape";
  icons?: string[];
}

export interface ManifestOutput {
  manifest: object;
  success: boolean;
  logs: string[];
  error?: string;
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: "image/png";
  purpose?: "any" | "maskable";
}

export interface ManifestShortcut {
  name: string;
  short_name: string;
  url: string;
  icons: ManifestIcon[];
}

export interface ManifestScreenshot {
  src: string;
  sizes: string;
  type: "image/png";
  form_factor: "narrow" | "wide";
  label: string;
}

export interface InstallableManifest {
  name: string;
  short_name: string;
  start_url: string;
  display: ManifestInput["display"];
  theme_color: string;
  background_color: string;
  orientation?: ManifestInput["orientation"];
  icons: ManifestIcon[];
  shortcuts: ManifestShortcut[];
  screenshots: ManifestScreenshot[];
}
