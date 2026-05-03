import type { GraphQLContext, ResolverConfig, ResolverMap, SubscriptionResolver } from '../types.js';
import { buildResolverContext } from '../utils/context-builder.util.js';

export const applyDataLoaders = (resolverMap: ResolverMap, config: ResolverConfig): ResolverMap => {
  const wrapped = Object.entries(resolverMap).reduce<ResolverMap>((typeAcc, [typeName, fields]) => {
    const wrappedFields = Object.entries(fields).reduce<ResolverMap[string]>((fieldAcc, [fieldName, resolver]) => {
      fieldAcc[fieldName] = isSubscriptionResolver(resolver)
        ? {
            ...resolver,
            subscribe: withLoaders(resolver.subscribe, config),
            resolve: resolver.resolve ? withLoaders(resolver.resolve, config) : undefined,
          }
        : withLoaders(resolver, config);
      return fieldAcc;
    }, {});

    typeAcc[typeName] = wrappedFields;
    return typeAcc;
  }, {});

  return wrapped;
};

const withLoaders = (
  resolver: (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: unknown) => unknown,
  config: ResolverConfig,
) => async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: unknown) => {
  const nextContext = buildResolverContext(context);

  for (const [loaderName, createLoader] of Object.entries(config.loaderFactories ?? {})) {
    if (!nextContext.loaders?.[loaderName]) {
      nextContext.loaders = {
        ...(nextContext.loaders ?? {}),
        [loaderName]: createLoader(nextContext),
      };
    }
  }

  return resolver(parent, args, nextContext, info);
};

const isSubscriptionResolver = (
  resolver: ResolverMap[string][string],
): resolver is SubscriptionResolver =>
  typeof resolver === 'object' && resolver !== null && 'subscribe' in resolver;
