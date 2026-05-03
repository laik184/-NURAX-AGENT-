import type { AgentResult, AuthRequest } from '../types';
import { hashText } from '../utils/crypto.util';
import { mapNativeError } from '../utils/error-mapper.util';

interface PinAuthData {
  authenticated: boolean;
}

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 12;

export const fallbackPinAgent = async (request: AuthRequest): Promise<AgentResult<PinAuthData>> => {
  const logs: string[] = ['Starting fallback PIN authentication flow.'];
  const pin = request.pin ?? '';

  if (!/^\d+$/.test(pin) || pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) {
    logs.push('PIN validation failed due to invalid format or length.');
    return { success: false, logs, error: mapNativeError('PIN_INVALID'), data: { authenticated: false } };
  }

  if (!request.pinHash) {
    logs.push('No stored PIN hash available for comparison.');
    return { success: false, logs, error: mapNativeError('PIN_INVALID'), data: { authenticated: false } };
  }

  const computedHash = await hashText(pin);
  if (computedHash !== request.pinHash) {
    logs.push('PIN hash comparison failed.');
    return { success: false, logs, error: mapNativeError('PIN_INVALID'), data: { authenticated: false } };
  }

  logs.push('PIN authentication successful.');
  return { success: true, logs, data: { authenticated: true } };
};
