import type { ResolverConfig, ResolverMap, SubscriptionResolver } from '../types.js';
import { parseSchemaInput } from '../utils/args-parser.util.js';
import {
  createDelegatingResolver,
  createDelegatingSubscriptionResolver,
} from '../utils/resolver-template.util.js';

export const generateSubscriptionResolvers = (
  config: ResolverConfig,
): ResolverMap['Subscription'] => {
  const parsedSchema = parseSchemaInput(config.schema);

  return parsedSchema.subscriptions.reduce<ResolverMap['Subscription']>((acc, fieldName) => {
    const resolver: SubscriptionResolver = {
      subscribe: createDelegatingSubscriptionResolver(`Subscription.${fieldName}.subscribe`, config.handlers),
      resolve: createDelegatingResolver(`Subscription.${fieldName}.resolve`, config.handlers),
    };

    acc[fieldName] = resolver;
    return acc;
  }, {});
};
