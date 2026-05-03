import type { AgentResult, AuthRequest } from '../types';
import { decryptAes, encryptAes } from '../utils/crypto.util';
import { mapNativeError } from '../utils/error-mapper.util';
import { secureGet, secureSet } from '../utils/secure-storage.util';

interface TokenProtectorData {
  encryptedToken?: string;
  decryptedToken?: string;
}

const STORAGE_KEY = 'auth_access_token';

export const tokenProtectorAgent = async (
  request: AuthRequest,
): Promise<AgentResult<TokenProtectorData>> => {
  const logs: string[] = ['Starting token protector flow.'];
  const secret = `${request.userId}:mobile-token-protector`;

  if (request.plainToken) {
    const encryptedToken = await encryptAes(request.plainToken, secret);
    await secureSet(STORAGE_KEY, encryptedToken);
    logs.push('Token encrypted and stored in secure storage.');
    return { success: true, logs, data: { encryptedToken } };
  }

  const encryptedToken = request.encryptedToken ?? (await secureGet(STORAGE_KEY));
  if (!encryptedToken) {
    logs.push('No encrypted token found in request or secure storage.');
    return { success: false, logs, error: mapNativeError('TOKEN_MISSING') };
  }

  const decryptedToken = await decryptAes(encryptedToken, secret);
  logs.push('Token decrypted successfully.');
  return { success: true, logs, data: { encryptedToken, decryptedToken } };
};
