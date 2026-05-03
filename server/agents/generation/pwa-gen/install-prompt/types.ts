export type DeviceType = "android" | "ios" | "desktop" | "unknown";

export interface InstallPromptState {
  readonly deferredPrompt: DeferredPromptHandle | null;
  readonly isInstalled: boolean;
  readonly dismissedCount: number;
  readonly lastShownAt: number | null;
  readonly deviceType: DeviceType;
}

export interface DeferredPromptHandle {
  readonly id: string;
  readonly canPrompt: boolean;
}

export interface InstallEnvironment {
  readonly now: number;
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
  readonly isStandalone: boolean;
  readonly visitCount: number;
  readonly scrollDepthPercent: number;
  readonly isExitIntent: boolean;
  readonly hasInstallClick: boolean;
}

export interface InstallResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}
