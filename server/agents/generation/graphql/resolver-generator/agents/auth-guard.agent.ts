import type { GraphQLContext, ResolverConfig, ResolverMap, SubscriptionResolver } from '../types.js';

export const applyAuthGuards = (resolverMap: ResolverMap, config: ResolverConfig): ResolverMap =>
  Object.entries(resolverMap).reduce<ResolverMap>((typeAcc, [typeName, fields]) => {
    const guardedFields = Object.entries(fields).reduce<ResolverMap[string]>((fieldAcc, [fieldName, resolver]) => {
      const resolverPath = `${typeName}.${fieldName}`;
      const required = config.permissions?.[resolverPath] ?? [];

      fieldAcc[fieldName] = isSubscriptionResolver(resolver)
        ? {
            ...resolver,
            subscribe: withGuard(resolver.subscribe, required),
            resolve: resolver.resolve ? withGuard(resolver.resolve, required) : undefined,
          }
        : withGuard(resolver, required);

      return fieldAcc;
    }, {});

    typeAcc[typeName] = guardedFields;
    return typeAcc;
  }, {});

const withGuard = (
  resolver: (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: unknown) => unknown,
  requiredPermissions: ReadonlyArray<string>,
) => async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext, info: unknown) => {
  if (!requiredPermissions.length) {
    return resolver(parent, args, context, info);
  }

  const grantedPermissions = new Set([
    ...(context.user?.permissions ?? []),
    ...(context.user?.roles ?? []),
  ]);

  const unauthorized = requiredPermissions.some((permission) => !grantedPermissions.has(permission));

  if (unauthorized) {
    throw new Error(`Unauthorized: missing required permissions for resolver`);
  }

  return resolver(parent, args, context, info);
};

const isSubscriptionResolver = (
  resolver: ResolverMap[string][string],
): resolver is SubscriptionResolver =>
  typeof resolver === 'object' && resolver !== null && 'subscribe' in resolver;
