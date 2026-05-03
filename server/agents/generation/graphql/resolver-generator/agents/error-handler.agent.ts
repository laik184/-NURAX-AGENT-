import type { GraphQLContext, ResolverMap, SubscriptionResolver } from '../types.js';

interface NormalizedError extends Error {
  extensions?: {
    code: string;
    resolverPath: string;
    requestId?: string;
  };
}

export const applyErrorHandling = (resolverMap: ResolverMap): ResolverMap =>
  Object.entries(resolverMap).reduce<ResolverMap>((typeAcc, [typeName, fields]) => {
    const safeFields = Object.entries(fields).reduce<ResolverMap[string]>((fieldAcc, [fieldName, resolver]) => {
      const path = `${typeName}.${fieldName}`;
      fieldAcc[fieldName] = isSubscriptionResolver(resolver)
        ? {
            ...resolver,
            subscribe: withNormalizedError(resolver.subscribe, `${path}.subscribe`),
            resolve: resolver.resolve
              ? withNormalizedError(resolver.resolve, `${path}.resolve`)
              : undefined,
          }
        : withNormalizedError(resolver, path);

      return fieldAcc;
    }, {});

    typeAcc[typeName] = safeFields;
    return typeAcc;
  }, {});

const withNormalizedError = (
  resolver: (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: unknown) => unknown,
  resolverPath: string,
) => async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: unknown) => {
  try {
    return await resolver(parent, args, context, info);
  } catch (error) {
    throw normalizeError(error, resolverPath, context.requestId);
  }
};

const normalizeError = (error: unknown, resolverPath: string, requestId?: string): NormalizedError => {
  const baseError = error instanceof Error ? error : new Error('Unknown resolver error');
  const normalized = new Error(baseError.message) as NormalizedError;
  normalized.name = baseError.name || 'GraphQLResolverError';
  normalized.extensions = {
    code: 'RESOLVER_EXECUTION_ERROR',
    resolverPath,
    requestId,
  };

  return normalized;
};

const isSubscriptionResolver = (
  resolver: ResolverMap[string][string],
): resolver is SubscriptionResolver =>
  typeof resolver === 'object' && resolver !== null && 'subscribe' in resolver;
