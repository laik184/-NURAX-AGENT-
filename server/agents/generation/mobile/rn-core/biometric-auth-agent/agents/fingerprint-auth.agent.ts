import type { AgentResult, AuthRequest } from '../types';
import { mapNativeError } from '../utils/error-mapper.util';

interface FingerprintAuthData {
  authenticated: boolean;
  lockedOut: boolean;
}

export const fingerprintAuthAgent = async (request: AuthRequest): Promise<AgentResult<FingerprintAuthData>> => {
  const logs: string[] = ['Starting fingerprint authentication flow.'];
  const result = request.biometricAuthResult?.fingerprint ?? 'failure';

  if (result === 'success') {
    logs.push('Fingerprint authentication succeeded.');
    return { success: true, logs, data: { authenticated: true, lockedOut: false } };
  }

  if (result === 'lockout') {
    logs.push('Fingerprint authentication lockout detected.');
    return {
      success: false,
      logs,
      error: mapNativeError('BIOMETRIC_LOCKOUT'),
      data: { authenticated: false, lockedOut: true },
    };
  }

  if (result === 'cancelled') {
    logs.push('Fingerprint authentication cancelled by user.');
    return {
      success: false,
      logs,
      error: mapNativeError('AUTH_CANCELLED'),
      data: { authenticated: false, lockedOut: false },
    };
  }

  logs.push('Fingerprint authentication failed.');
  return {
    success: false,
    logs,
    error: mapNativeError(request.nativeErrorCode ?? 'BIOMETRIC_NOT_AVAILABLE'),
    data: { authenticated: false, lockedOut: false },
  };
};
