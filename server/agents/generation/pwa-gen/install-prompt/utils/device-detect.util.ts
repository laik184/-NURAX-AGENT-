export type DeviceDetection = Readonly<{
  type: "android" | "ios" | "desktop" | "unknown";
  isMobile: boolean;
}>;

export function detectDevice(input: {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
}): DeviceDetection {
  const ua = input.userAgent.toLowerCase();
  const platform = input.platform.toLowerCase();

  const isAndroid = ua.includes("android");
  const isIOS = /iphone|ipad|ipod/.test(ua) || (platform.includes("mac") && input.maxTouchPoints > 1);

  if (isAndroid) {
    return Object.freeze({ type: "android", isMobile: true });
  }

  if (isIOS) {
    return Object.freeze({ type: "ios", isMobile: true });
  }

  if (ua.length > 0) {
    return Object.freeze({ type: "desktop", isMobile: false });
  }

  return Object.freeze({ type: "unknown", isMobile: false });
}
