import { UiIntent } from '../types.js';

export const generateRepositoryConnectorAgent = (
  repositoryName: string,
  intents: UiIntent[],
): string => {
  const signatures = intents
    .map((intent) => {
      const payloadArg = intent.payloadType ? 'intent.payload' : '';
      const invocation = `${repositoryName}.${intent.repositoryMethod}(${payloadArg})`;
      return `            is Intent.${intent.name} -> ${invocation}`;
    })
    .join('\n');

  return `private suspend fun executeIntent(intent: Intent): Result<Any?> = runCatching {
        when (intent) {
${signatures}
        }
    }`;
};
