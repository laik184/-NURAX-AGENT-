import type { GraphQLContext } from '../types.js';

export const buildResolverContext = (context: GraphQLContext): GraphQLContext => ({
  ...context,
  loaders: {
    ...(context.loaders ?? {}),
  },
  services: {
    ...(context.services ?? {}),
  },
});
