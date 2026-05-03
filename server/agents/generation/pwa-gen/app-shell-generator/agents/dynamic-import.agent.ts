import { AppShellInput } from '../types.js';

export interface LazyChunkPlan {
  path: string;
  importExpression: string;
}

const normalizedChunkName = (chunkName: string): string => chunkName.replace(/[^a-zA-Z0-9_-]/g, '-');

const shouldPrewarm = (priority: 'critical' | 'deferred'): boolean => priority === 'critical';

export const dynamicImportAgent = (input: AppShellInput): ReadonlyArray<LazyChunkPlan> => {
  const plans = input.routes.map((route) => {
    const chunk = normalizedChunkName(route.chunkName);
    const importExpression = shouldPrewarm(route.priority)
      ? `import(/* webpackPreload: true, webpackChunkName: \"${chunk}\" */ './routes/${chunk}.js')`
      : `import(/* webpackChunkName: \"${chunk}\" */ './routes/${chunk}.js')`;

    return Object.freeze({ path: route.path, importExpression });
  });

  return Object.freeze(plans);
};
