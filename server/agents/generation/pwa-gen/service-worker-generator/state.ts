export interface SWState {
  readonly installed: boolean;
  readonly activated: boolean;
  readonly cacheVersion: string;
}

export function createInitialSWState(cacheVersion: string): Readonly<SWState> {
  return Object.freeze({
    installed: false,
    activated: false,
    cacheVersion,
  });
}
