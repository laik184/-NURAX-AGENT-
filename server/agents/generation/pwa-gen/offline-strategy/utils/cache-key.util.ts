export const normalizeRequestUrl = (rawUrl: string): string => {
  const normalized = rawUrl.trim();
  const hasProtocol = normalized.startsWith('http://') || normalized.startsWith('https://');
  const source = hasProtocol ? normalized : `https://local${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  const parsed = new URL(source);

  const sorted = [...parsed.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const pathname = parsed.pathname.endsWith('/') && parsed.pathname !== '/'
    ? parsed.pathname.slice(0, -1)
    : parsed.pathname;

  return `${pathname.toLowerCase()}${sorted.length > 0 ? `?${sorted}` : ''}`;
};

export const createCacheKey = (method: string, rawUrl: string): string =>
  `${method.trim().toUpperCase()}:${normalizeRequestUrl(rawUrl)}`;
