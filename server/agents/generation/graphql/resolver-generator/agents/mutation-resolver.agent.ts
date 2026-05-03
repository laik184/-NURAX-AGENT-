import type { ResolverConfig, ResolverMap } from '../types.js';
import { parseSchemaInput } from '../utils/args-parser.util.js';
import { createDelegatingResolver } from '../utils/resolver-template.util.js';

export const generateMutationResolvers = (config: ResolverConfig): ResolverMap['Mutation'] => {
  const parsedSchema = parseSchemaInput(config.schema);

  return parsedSchema.mutations.reduce<ResolverMap['Mutation']>((acc, fieldName) => {
    acc[fieldName] = createDelegatingResolver(`Mutation.${fieldName}`, config.handlers);
    return acc;
  }, {});
};
