import type { AgentResult, AuthRequest, DeviceSecurityReport } from '../types';
import { mapNativeError } from '../utils/error-mapper.util';

export const deviceSecurityCheckAgent = async (
  request: AuthRequest,
): Promise<AgentResult<DeviceSecurityReport>> => {
  const logs: string[] = ['Running device security posture checks.'];
  const signals = request.securitySignals ?? {};

  const reasons: string[] = [];
  if (signals.rootedOrJailbroken) {
    reasons.push('rooted_or_jailbroken_detected');
  }
  if (signals.emulator) {
    reasons.push('emulator_detected');
  }
  if (signals.debugMode) {
    reasons.push('debug_mode_detected');
  }

  const report: DeviceSecurityReport = {
    isRootedOrJailbroken: Boolean(signals.rootedOrJailbroken),
    isEmulator: Boolean(signals.emulator),
    isDebugMode: Boolean(signals.debugMode),
    safe: reasons.length === 0,
    reasons,
  };

  if (!report.safe) {
    logs.push(`Unsafe device detected: ${reasons.join(',')}`);
    return { success: false, logs, error: mapNativeError('DEVICE_UNSAFE'), data: report };
  }

  logs.push('Device passed security checks.');
  return { success: true, logs, data: report };
};
