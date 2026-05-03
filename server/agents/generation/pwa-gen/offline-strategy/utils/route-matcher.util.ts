export type RouteKind = 'api' | 'assets' | 'pages';

export const classifyRoute = (rawUrl: string): RouteKind => {
  const url = rawUrl.trim().toLowerCase();

  if (url.startsWith('/api') || url.includes('/api/')) {
    return 'api';
  }

  if (url.startsWith('/assets') || url.includes('/assets/')) {
    return 'assets';
  }

  return 'pages';
};

export const matchesRoutePrefix = (rawUrl: string, prefix: string): boolean =>
  rawUrl.trim().toLowerCase().startsWith(prefix.trim().toLowerCase());
