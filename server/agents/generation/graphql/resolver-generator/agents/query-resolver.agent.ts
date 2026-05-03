import type { ResolverConfig, ResolverMap } from '../types.js';
import { parseSchemaInput } from '../utils/args-parser.util.js';
import { createDelegatingResolver } from '../utils/resolver-template.util.js';

export const generateQueryResolvers = (config: ResolverConfig): ResolverMap['Query'] => {
  const parsedSchema = parseSchemaInput(config.schema);

  return parsedSchema.queries.reduce<ResolverMap['Query']>((acc, fieldName) => {
    acc[fieldName] = createDelegatingResolver(`Query.${fieldName}`, config.handlers);
    return acc;
  }, {});
};
