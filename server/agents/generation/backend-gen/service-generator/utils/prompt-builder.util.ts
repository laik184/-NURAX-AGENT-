import type { DependencyConfig, ServiceConfig, ServiceMethod } from '../types.js';

const formatDependencies = (dependencies: DependencyConfig[]): string =>
  dependencies
    .map((dependency) => `- ${dependency.name} (${dependency.type})`)
    .join('\n');

const formatMethods = (methods: ServiceMethod[]): string =>
  methods
    .map((method) => `- ${method.name} [${method.operation}] :: ${method.inputType} -> ${method.outputType}`)
    .join('\n');

export const promptBuilderUtil = {
  build(config: ServiceConfig, methods: ServiceMethod[], dependencies: DependencyConfig[]): string {
    return [
      `Generate a ${config.framework} service for entity ${config.entityName}.`,
      `Validation mode: ${config.validation}.`,
      'Methods:',
      formatMethods(methods) || '- none',
      'Dependencies:',
      formatDependencies(dependencies) || '- none',
      'Use async/await, dependency injection, and predictable error handling.',
    ].join('\n');
  },
};
