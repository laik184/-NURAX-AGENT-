export type ViewModelGeneratorStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export type StateContainerType = 'StateFlow' | 'LiveData';

export interface ViewModelConfig {
  featureName: string;
  packageName: string;
  repositoryName: string;
  intents: UiIntent[];
  stateProperties: UiStateProperty[];
  defaultDispatcher?: string;
  stateContainer?: StateContainerType;
}

export interface UiStateProperty {
  name: string;
  type: string;
  defaultValue: string;
}

export interface UiState {
  name: string;
  properties: UiStateProperty[];
}

export interface UiIntent {
  name: string;
  payloadType?: string;
  repositoryMethod: string;
  resultProperty?: string;
}

export interface GeneratedFile {
  name: string;
  content: string;
}

export interface ViewModelResult {
  success: boolean;
  files: GeneratedFile[];
  logs: string[];
  error?: string;
}

export interface ViewModelGenerationArtifacts {
  stateCode: string;
  intentCode: string;
  repositoryCode: string;
  coroutineHandlersCode: string;
}
