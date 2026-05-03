import type { ResolverConfig, ResolverMap } from '../types.js';
import { parseSchemaInput } from '../utils/args-parser.util.js';
import { createDelegatingResolver } from '../utils/resolver-template.util.js';

export const generateFieldResolvers = (config: ResolverConfig): ResolverMap => {
  const parsedSchema = parseSchemaInput(config.schema);

  return Object.entries(parsedSchema.fields).reduce<ResolverMap>((acc, [typeName, fieldNames]) => {
    const fieldResolvers = fieldNames.reduce<ResolverMap[string]>((fieldMap, fieldName) => {
      fieldMap[fieldName] = createDelegatingResolver(`${typeName}.${fieldName}`, config.handlers);
      return fieldMap;
    }, {});

    acc[typeName] = fieldResolvers;
    return acc;
  }, {});
};
