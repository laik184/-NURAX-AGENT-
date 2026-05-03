import { detectDevice } from "../utils/device-detect.util.js";

export interface InstallButtonModel {
  readonly visible: boolean;
  readonly cta: "Install Now" | "Add to Home";
  readonly variant: "primary" | "compact";
}

export interface InstallButtonAgentOutput {
  readonly button: InstallButtonModel;
  readonly logs: readonly string[];
}

export function buildInstallButtonAgent(input: {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
  readonly hasDeferredPrompt: boolean;
  readonly isInstalled: boolean;
}): InstallButtonAgentOutput {
  const device = detectDevice(input);
  const visible = input.hasDeferredPrompt && !input.isInstalled;

  const cta = device.type === "ios" ? "Add to Home" : "Install Now";
  const variant = device.isMobile ? "compact" : "primary";

  return Object.freeze({
    button: Object.freeze({ visible, cta, variant }),
    logs: Object.freeze([`install-button: rendered ${variant} ${cta} button (visible=${String(visible)})`]),
  });
}
