import type { ServiceConfig, ServiceMethod } from '../types.js';

const buildCrudMethods = (entityName: string): ServiceMethod[] => [
  {
    name: `create${entityName}`,
    operation: 'create',
    inputType: `Create${entityName}Dto`,
    outputType: entityName,
    description: `Create a new ${entityName}`,
  },
  {
    name: `update${entityName}`,
    operation: 'update',
    inputType: `Update${entityName}Dto`,
    outputType: entityName,
    description: `Update existing ${entityName}`,
  },
  {
    name: `delete${entityName}`,
    operation: 'delete',
    inputType: 'string',
    outputType: 'boolean',
    description: `Delete ${entityName} by id`,
  },
  {
    name: `find${entityName}`,
    operation: 'find',
    inputType: 'string',
    outputType: `${entityName} | null`,
    description: `Find ${entityName} by id`,
  },
];

export const servicePlannerAgent = {
  plan(config: ServiceConfig): ServiceMethod[] {
    const methods: ServiceMethod[] = config.includeCrud ? buildCrudMethods(config.entityName) : [];

    const customMethods: ServiceMethod[] =
      config.customMethods?.map((method) => ({
        ...method,
        operation: 'custom',
      })) ?? [];

    const deduped = [...methods, ...customMethods].filter(
      (method, index, current) => current.findIndex((item) => item.name === method.name) === index,
    );

    return deduped;
  },
};
