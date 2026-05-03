const toPascalCase = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');

export const getViewModelName = (featureName: string): string => `${toPascalCase(featureName)}ViewModel`;

export const getStateName = (featureName: string): string => `${toPascalCase(featureName)}UiState`;

export const getIntentName = (featureName: string): string => `${toPascalCase(featureName)}Intent`;

export const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal.length > 0 ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : pascal;
};
