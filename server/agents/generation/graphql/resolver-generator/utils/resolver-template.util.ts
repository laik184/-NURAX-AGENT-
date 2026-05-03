import type { GraphQLContext, ResolverFn } from '../types.js';

export const createDelegatingResolver = (path: string, handlers: Readonly<Record<string, ResolverFn>> = {}): ResolverFn =>
  async (parent, args, context, info) => {
    const handler = handlers[path] ?? getHandlerFromContext(path, context);

    if (handler) {
      return handler(parent, args, context, info);
    }

    return {
      path,
      parent,
      args,
      requestId: context.requestId,
    };
  };

export const createDelegatingSubscriptionResolver = (
  path: string,
  handlers: Readonly<Record<string, ResolverFn>> = {},
): ResolverFn<AsyncIterable<unknown> | unknown> => async (parent, args, context, info) => {
  const handler = handlers[path] ?? getHandlerFromContext(path, context);

  if (handler) {
    return handler(parent, args, context, info);
  }

  return emptyAsyncIterator();
};

const getHandlerFromContext = (path: string, context: GraphQLContext): ResolverFn | undefined => {
  const services = context.services as { resolverRegistry?: Readonly<Record<string, ResolverFn>> } | undefined;
  return services?.resolverRegistry?.[path];
};

const emptyAsyncIterator = async function* () {
  return;
};
