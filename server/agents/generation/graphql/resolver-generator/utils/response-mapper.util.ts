import type { ResolverGeneratorOutput, ResolverMap } from '../types.js';

export const mapResolverOutput = (
  success: boolean,
  resolvers: ResolverMap,
  logs: ReadonlyArray<string>,
  error?: string,
): Readonly<ResolverGeneratorOutput> => {
  const output: ResolverGeneratorOutput = {
    success,
    resolvers,
    logs: [...logs],
    ...(error ? { error } : {}),
  };

  return Object.freeze(output);
};
