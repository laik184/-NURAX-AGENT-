import type { AgentResult, AuthRequest, BiometricType } from '../types';
import { getPlatformOS, isAndroid, isIOS } from '../utils/platform.util';

interface BiometricCheckData {
  available: boolean;
  types: BiometricType[];
  platform: string;
}

export const biometricCheckAgent = async (request: AuthRequest): Promise<AgentResult<BiometricCheckData>> => {
  const logs: string[] = ['Starting biometric capability check.'];
  const platform = getPlatformOS();
  const configured = request.biometricCapabilities;

  if (!configured || !configured.available || configured.types.length === 0) {
    logs.push('Biometric capability not configured or unavailable.');
    return { success: true, logs, data: { available: false, types: ['none'], platform } };
  }

  const filtered = configured.types.filter((type) => {
    if (type === 'fingerprint' && isAndroid()) {
      logs.push('Fingerprint detected via Android BiometricManager mapping.');
      return true;
    }

    if (type === 'face' && isIOS()) {
      logs.push('Face ID detected via LocalAuthentication mapping.');
      return true;
    }

    if (platform === 'unknown') {
      logs.push(`Allowing ${type} capability on unknown platform.`);
      return true;
    }

    return false;
  });

  if (filtered.length === 0) {
    logs.push('No biometric type passed platform-specific filters.');
    return { success: true, logs, data: { available: false, types: ['none'], platform } };
  }

  return { success: true, logs, data: { available: true, types: filtered, platform } };
};
