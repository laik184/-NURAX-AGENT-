const ERROR_MAP: Record<string, string> = {
  BIOMETRIC_LOCKOUT: 'biometric_locked',
  BIOMETRIC_NOT_AVAILABLE: 'biometric_not_available',
  AUTH_CANCELLED: 'auth_cancelled',
  PIN_INVALID: 'pin_invalid',
  DEVICE_UNSAFE: 'device_not_secure',
  TOKEN_MISSING: 'token_missing',
  SESSION_EXPIRED: 'session_expired',
};

export const mapNativeError = (nativeCode?: string): string => {
  if (!nativeCode) {
    return 'unknown_error';
  }

  const normalized = nativeCode.trim().toUpperCase();
  return ERROR_MAP[normalized] ?? 'unknown_error';
};
