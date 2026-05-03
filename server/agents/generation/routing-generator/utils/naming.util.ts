export const toHandlerName = (routePath: string, prefix: 'api' | 'page'): string => {
  const cleaned = routePath
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');

  return `${prefix}${cleaned || 'Root'}Handler`;
};

export const toSafeFileName = (framework: string): string => framework.replace(/[^a-z0-9-]/gi, '').toLowerCase();
