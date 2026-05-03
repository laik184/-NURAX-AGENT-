export const normalizeRoutePath = (path: string): string => {
  const normalized = path.trim().replace(/\s+/g, "").replace(/\/+/g, "/");
  if (!normalized) {
    return "/";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};
