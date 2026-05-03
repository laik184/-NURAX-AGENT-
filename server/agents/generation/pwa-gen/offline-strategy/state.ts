export interface OfflineState {
  cacheVersion: string;
  routes: Record<string, 'network-first' | 'cache-first' | 'stale-while-revalidate'>;
}

export const initialState: OfflineState = Object.freeze({
  cacheVersion: 'v1',
  routes: {},
});
