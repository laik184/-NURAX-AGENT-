import type { ResolverGeneratorState, ResolverMap } from './types.js';

export const createInitialResolverGeneratorState = (
  schema: string | Record<string, unknown>,
): Readonly<ResolverGeneratorState> =>
  Object.freeze({
    schema,
    resolvers: {},
    status: 'IDLE',
    logs: [],
    errors: [],
  });

export const patchResolverGeneratorState = (
  state: Readonly<ResolverGeneratorState>,
  patch: Partial<ResolverGeneratorState>,
): Readonly<ResolverGeneratorState> =>
  Object.freeze({
    ...state,
    ...patch,
    resolvers: cloneResolverMap(patch.resolvers ?? state.resolvers),
    logs: [...(patch.logs ?? state.logs)],
    errors: [...(patch.errors ?? state.errors)],
  });

const cloneResolverMap = (map: ResolverMap): ResolverMap => {
  const entries = Object.entries(map).map(([typeName, fields]) => [typeName, { ...fields }]);
  return Object.fromEntries(entries);
};
