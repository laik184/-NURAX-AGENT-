import type { DependencyConfig, DependencyInjectionModel } from '../types.js';
import { namingUtil } from '../utils/naming.util.js';

export const dependencyInjectorAgent = {
  inject(entityName: string, dependencies: DependencyConfig[]): DependencyInjectionModel {
    const baseDependency: DependencyConfig = {
      name: namingUtil.repositoryPropertyName(entityName),
      type: 'repository',
    };

    const merged = [baseDependency, ...dependencies].filter(
      (dependency, index, current) => current.findIndex((item) => item.name === dependency.name) === index,
    );

    const properties = merged.map((dependency) => `private readonly ${dependency.name}: unknown;`);
    const constructorArgs = merged.map((dependency) => `private readonly ${dependency.name}: unknown`);

    return Object.freeze({
      properties,
      constructorArgs,
    });
  },
};
