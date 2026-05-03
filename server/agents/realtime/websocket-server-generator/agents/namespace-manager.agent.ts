import { websocketGeneratorState } from '../state.js';
import { Namespace } from '../types.js';
import { logMessage } from '../utils/logger.util.js';

export const namespaceManagerAgent = (namespaces: string[]): Namespace[] => {
  const unique = Array.from(new Set(namespaces));
  const built = unique.map((name) => ({ name, connectionIds: new Set<string>() }));
  websocketGeneratorState.namespaces = built;
  logMessage(`Namespaces configured: ${unique.join(', ')}`);
  return built;
};
