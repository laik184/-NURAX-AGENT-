import type { DeviceType, InstallPromptState } from "./types.js";

export function createInitialState(): InstallPromptState {
  return Object.freeze({
    deferredPrompt: null,
    isInstalled: false,
    dismissedCount: 0,
    lastShownAt: null,
    deviceType: "unknown" as DeviceType,
  });
}

export function withDeviceType(
  state: Readonly<InstallPromptState>,
  deviceType: DeviceType,
): InstallPromptState {
  return Object.freeze({ ...state, deviceType });
}

export function withDeferredPrompt(
  state: Readonly<InstallPromptState>,
  deferredPrompt: InstallPromptState["deferredPrompt"],
): InstallPromptState {
  return Object.freeze({ ...state, deferredPrompt });
}

export function withPromptShown(
  state: Readonly<InstallPromptState>,
  shownAt: number,
): InstallPromptState {
  return Object.freeze({ ...state, lastShownAt: shownAt });
}

export function withInstallAccepted(state: Readonly<InstallPromptState>): InstallPromptState {
  return Object.freeze({ ...state, isInstalled: true, deferredPrompt: null });
}

export function withInstallDismissed(state: Readonly<InstallPromptState>): InstallPromptState {
  return Object.freeze({ ...state, dismissedCount: state.dismissedCount + 1, deferredPrompt: null });
}
