import { UiIntent } from '../types.js';

export const mapUiIntentsAgent = (intentName: string, intents: UiIntent[]): string => {
  const items = intents
    .map((intent) => {
      if (intent.payloadType) {
        return `    data class ${intent.name}(val payload: ${intent.payloadType}) : ${intentName}`;
      }

      return `    data object ${intent.name} : ${intentName}`;
    })
    .join('\n');

  return `sealed interface ${intentName} {\n${items}\n}`;
};
