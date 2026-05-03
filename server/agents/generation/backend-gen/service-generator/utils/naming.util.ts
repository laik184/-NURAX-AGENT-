const toPascal = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

export const namingUtil = {
  serviceClassName(entityName: string): string {
    return `${toPascal(entityName)}Service`;
  },

  repositoryPropertyName(entityName: string): string {
    const normalized = toPascal(entityName);
    return `${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}Repository`;
  },

  serviceFileName(entityName: string): string {
    return `${entityName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase()}.service.ts`;
  },
};
