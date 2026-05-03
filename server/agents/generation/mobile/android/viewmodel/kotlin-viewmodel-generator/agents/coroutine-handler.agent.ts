import { UiIntent } from '../types.js';
import { stateUpdateExpression } from '../utils/flow.util.js';

export const generateCoroutineHandlerAgent = (
  stateContainer: 'StateFlow' | 'LiveData',
  intents: UiIntent[],
): string => {
  const mappings = intents
    .filter((intent) => intent.resultProperty)
    .map((intent) => {
      const resultType = intent.payloadType ?? 'Any?';
      return `                    is Intent.${intent.name} -> current.copy(${intent.resultProperty} = (result.getOrNull() as? ${resultType}) ?: current.${intent.resultProperty})`;
    })
    .join('\n');

  const successBody = mappings
    ? `${mappings}\n                    else -> current`
    : '                    else -> current';

  return `fun onIntent(intent: Intent) {
        viewModelScope.launch(dispatcher) {
            val result = executeIntent(intent)
            val current = ${stateContainer === 'LiveData' ? '_uiState.value ?: State()' : '_uiState.value'}

            val nextState = if (result.isSuccess) {
                when (intent) {
${successBody}
                }
            } else {
                val throwable = result.exceptionOrNull()
                current.copy(error = throwable?.message ?: "Unknown error")
            }

            ${stateUpdateExpression(stateContainer, 'nextState')}
        }
    }`;
};
