import { ViewModelConfig } from '../types.js';

export const validateViewModelConfigAgent = (config: ViewModelConfig): string[] => {
  const errors: string[] = [];

  if (!config.featureName?.trim()) {
    errors.push('featureName is required');
  }

  if (!config.packageName?.trim()) {
    errors.push('packageName is required');
  }

  if (!config.repositoryName?.trim()) {
    errors.push('repositoryName is required');
  }

  if (!Array.isArray(config.stateProperties) || config.stateProperties.length === 0) {
    errors.push('stateProperties must include at least one property');
  }

  if (!Array.isArray(config.intents) || config.intents.length === 0) {
    errors.push('intents must include at least one intent');
  }

  return errors;
};
