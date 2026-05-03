import { buildViewModelAgent } from './agents/viewmodel-builder.agent.js';
import { generateCoroutineHandlerAgent } from './agents/coroutine-handler.agent.js';
import { mapUiIntentsAgent } from './agents/intent-mapper.agent.js';
import { generateRepositoryConnectorAgent } from './agents/repository-connector.agent.js';
import { generateUiStateAgent } from './agents/state-generator.agent.js';
import { validateViewModelConfigAgent } from './agents/validation.agent.js';
import {
  getViewModelGeneratorState,
  resetViewModelGeneratorState,
  updateViewModelGeneratorState,
} from './state.js';
import { UiState, ViewModelConfig, ViewModelResult } from './types.js';
import { appendLog } from './utils/logger.util.js';
import { getIntentName, getStateName, getViewModelName, toCamelCase } from './utils/naming.util.js';

const freezeOutput = (output: ViewModelResult): Readonly<ViewModelResult> => Object.freeze(output);

const logStep = (message: string): void => {
  updateViewModelGeneratorState((state) => {
    appendLog(state.logs, message);
  });
};

export const validateViewModelConfig = (config: ViewModelConfig): Readonly<ViewModelResult> => {
  const errors = validateViewModelConfigAgent(config);

  return freezeOutput({
    success: errors.length === 0,
    files: [],
    logs: errors.length === 0 ? ['Configuration is valid.'] : [],
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  });
};

export const generateViewModel = (config: ViewModelConfig): Readonly<ViewModelResult> => {
  resetViewModelGeneratorState();

  updateViewModelGeneratorState((state) => {
    state.status = 'RUNNING';
    appendLog(state.logs, 'Started ViewModel generation.');
  });

  const errors = validateViewModelConfigAgent(config);

  if (errors.length > 0) {
    updateViewModelGeneratorState((state) => {
      state.status = 'FAILED';
      state.errors.push(...errors);
      appendLog(state.logs, 'Validation failed.');
    });

    return freezeOutput({
      success: false,
      files: [],
      logs: [...getViewModelGeneratorState().logs],
      error: errors.join('; '),
    });
  }

  const stateName = getStateName(config.featureName);
  const intentName = getIntentName(config.featureName);
  const viewModelName = getViewModelName(config.featureName);
  const repositoryFieldName = toCamelCase(config.repositoryName);
  const repositoryTypeName = `${config.repositoryName.charAt(0).toUpperCase()}${config.repositoryName.slice(1)}`;
  const stateContainer = config.stateContainer ?? 'StateFlow';

  const uiState: UiState = {
    name: stateName,
    properties: config.stateProperties,
  };

  const stateCode = generateUiStateAgent(uiState);
  logStep('Generated UiState.');

  const intentCode = mapUiIntentsAgent(intentName, config.intents);
  logStep('Mapped intents.');

  const repositoryCode = generateRepositoryConnectorAgent(repositoryFieldName, config.intents);
  logStep('Connected repository layer.');

  const coroutineHandlersCode = generateCoroutineHandlerAgent(stateContainer, config.intents);
  logStep('Generated coroutine handling.');

  const content = buildViewModelAgent({
    packageName: config.packageName,
    viewModelName,
    stateName,
    intentName,
    repositoryFieldName,
    repositoryTypeName,
    dispatcherName: config.defaultDispatcher ?? 'Dispatchers.IO',
    stateContainer,
    stateCode,
    intentCode,
    repositoryCode,
    coroutineHandlersCode,
  });

  const fileName = `${viewModelName}.kt`;

  updateViewModelGeneratorState((state) => {
    state.status = 'SUCCESS';
    state.generatedFiles.push(fileName);
    appendLog(state.logs, `Generated ${fileName}.`);
  });

  return freezeOutput({
    success: true,
    files: [
      {
        name: fileName,
        content,
      },
    ],
    logs: [...getViewModelGeneratorState().logs],
  });
};
