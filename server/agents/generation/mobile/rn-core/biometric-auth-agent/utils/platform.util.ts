export type RuntimePlatform = 'ios' | 'android' | 'unknown';

export const getPlatformOS = (): RuntimePlatform => {
  const maybeNativePlatform =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { __RN_PLATFORM__?: unknown }).__RN_PLATFORM__ === 'string'
      ? String((globalThis as { __RN_PLATFORM__?: string }).__RN_PLATFORM__).toLowerCase()
      : '';

  if (maybeNativePlatform === 'ios' || maybeNativePlatform === 'android') {
    return maybeNativePlatform;
  }

  const processPlatform =
    typeof process !== 'undefined' && process.platform ? process.platform.toLowerCase() : '';

  if (processPlatform === 'darwin') {
    return 'ios';
  }

  if (processPlatform === 'linux') {
    return 'android';
  }

  return 'unknown';
};

export const isIOS = (): boolean => getPlatformOS() === 'ios';

export const isAndroid = (): boolean => getPlatformOS() === 'android';
