import { UiState } from '../types.js';

export const generateUiStateAgent = (uiState: UiState): string => {
  const properties = uiState.properties
    .map((property) => `    val ${property.name}: ${property.type} = ${property.defaultValue}`)
    .join(',\n');

  return `data class ${uiState.name}(\n${properties}\n)`;
};
