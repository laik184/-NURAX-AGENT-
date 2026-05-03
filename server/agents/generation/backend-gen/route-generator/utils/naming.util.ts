const toWordParts = (value: string): string[] =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());

export const toCamelCase = (value: string): string => {
  const parts = toWordParts(value);
  return parts
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
};

export const createRouteName = (method: string, path: string): string => {
  const sanitizedPath = path.replace(/[:/{}]/g, " ");
  return toCamelCase(`${method} ${sanitizedPath}`);
};
