import type { AgentResult, AuthRequest } from '../types';
import { mapNativeError } from '../utils/error-mapper.util';
import { isIOS } from '../utils/platform.util';

interface FaceAuthData {
  authenticated: boolean;
  lockedOut: boolean;
}

export const faceIdAuthAgent = async (request: AuthRequest): Promise<AgentResult<FaceAuthData>> => {
  const logs: string[] = ['Starting Face ID authentication flow.'];

  if (!isIOS()) {
    logs.push('Face ID is only available on iOS platforms.');
    return {
      success: false,
      logs,
      error: mapNativeError('BIOMETRIC_NOT_AVAILABLE'),
      data: { authenticated: false, lockedOut: false },
    };
  }

  const result = request.biometricAuthResult?.face ?? 'failure';

  if (result === 'success') {
    logs.push('Face ID authentication succeeded.');
    return { success: true, logs, data: { authenticated: true, lockedOut: false } };
  }

  if (result === 'lockout') {
    logs.push('Face ID lockout detected.');
    return {
      success: false,
      logs,
      error: mapNativeError('BIOMETRIC_LOCKOUT'),
      data: { authenticated: false, lockedOut: true },
    };
  }

  if (result === 'cancelled') {
    logs.push('Face ID cancelled by user.');
    return {
      success: false,
      logs,
      error: mapNativeError('AUTH_CANCELLED'),
      data: { authenticated: false, lockedOut: false },
    };
  }

  logs.push('Face ID authentication failed.');
  return {
    success: false,
    logs,
    error: mapNativeError(request.nativeErrorCode ?? 'BIOMETRIC_NOT_AVAILABLE'),
    data: { authenticated: false, lockedOut: false },
  };
};
