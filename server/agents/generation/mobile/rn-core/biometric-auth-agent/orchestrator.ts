import { authSessionManagerAgent } from './agents/auth-session-manager.agent';
import { biometricCheckAgent } from './agents/biometric-check.agent';
import { deviceSecurityCheckAgent } from './agents/device-security-check.agent';
import { faceIdAuthAgent } from './agents/faceid-auth.agent';
import { fallbackPinAgent } from './agents/fallback-pin.agent';
import { fingerprintAuthAgent } from './agents/fingerprint-auth.agent';
import { threatDetectorAgent } from './agents/threat-detector.agent';
import { tokenProtectorAgent } from './agents/token-protector.agent';
import { DEFAULT_AUTH_STATE } from './state';
import type { AgentResult, AuthRequest, AuthResponse, AuthState, BiometricType } from './types';

export const runBiometricAuthOrchestrator = async (
  request: AuthRequest,
  currentState: Readonly<AuthState> = DEFAULT_AUTH_STATE,
): Promise<AgentResult<AuthResponse>> => {
  const logs: string[] = ['Orchestrator started.'];
  const now = request.timestampMs ?? Date.now();

  const deviceSecurityResult = await deviceSecurityCheckAgent(request);
  logs.push(...deviceSecurityResult.logs);
  if (!deviceSecurityResult.success) {
    return {
      success: false,
      logs,
      error: deviceSecurityResult.error,
      data: { authStatus: 'failed', method: 'none', standardizedError: deviceSecurityResult.error },
    };
  }

  const capabilityResult = await biometricCheckAgent(request);
  logs.push(...capabilityResult.logs);

  const preferredMethod: BiometricType =
    request.preferredBiometric && capabilityResult.data?.types.includes(request.preferredBiometric)
      ? request.preferredBiometric
      : capabilityResult.data?.types[0] ?? 'none';

  const biometricResult =
    preferredMethod === 'fingerprint'
      ? await fingerprintAuthAgent(request)
      : preferredMethod === 'face'
        ? await faceIdAuthAgent(request)
        : { success: false, logs: ['No biometric method available.'], error: 'biometric_not_available' };

  logs.push(...biometricResult.logs);

  const authAttemptResult = biometricResult.success ? biometricResult : await fallbackPinAgent(request);
  if (!biometricResult.success) {
    logs.push(...authAttemptResult.logs);
  }

  const threatResult = await threatDetectorAgent(currentState, authAttemptResult.success, now);
  logs.push(...threatResult.logs);

  if (!authAttemptResult.success) {
    return {
      success: false,
      logs,
      error: authAttemptResult.error ?? threatResult.error,
      data: {
        authStatus: threatResult.data?.state.authStatus ?? 'failed',
        method: authAttemptResult === biometricResult ? preferredMethod : 'pin',
        lockUntil: threatResult.data?.lockUntil,
        standardizedError: authAttemptResult.error ?? threatResult.error,
      },
    };
  }

  const tokenResult = await tokenProtectorAgent(request);
  logs.push(...tokenResult.logs);

  const sessionResult = await authSessionManagerAgent(request, threatResult.data?.state ?? currentState);
  logs.push(...sessionResult.logs);

  if (!tokenResult.success || !sessionResult.success) {
    return {
      success: false,
      logs,
      error: tokenResult.error ?? sessionResult.error,
      data: {
        authStatus: 'failed',
        method: authAttemptResult === biometricResult ? preferredMethod : 'pin',
        standardizedError: tokenResult.error ?? sessionResult.error,
      },
    };
  }

  return {
    success: true,
    logs,
    data: {
      authStatus: sessionResult.data?.state.authStatus ?? 'authenticated',
      method: authAttemptResult === biometricResult ? preferredMethod : 'pin',
      token: tokenResult.data?.decryptedToken ?? request.plainToken,
      sessionExpiresAt: sessionResult.data?.state.sessionExpiry ?? undefined,
    },
  };
};
