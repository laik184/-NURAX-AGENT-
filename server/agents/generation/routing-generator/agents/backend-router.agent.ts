import type { FrameworkType, GeneratedFile, Route } from '../types.js';
import { toSafeFileName } from '../utils/naming.util.js';
import { loadBackendTemplate } from '../utils/template-loader.util.js';

const backendFramework = (framework: FrameworkType): FrameworkType => {
  if (framework === 'express' || framework === 'fastify' || framework === 'nestjs') {
    return framework;
  }
  return 'express';
};

export const generateBackendRouter = (
  framework: FrameworkType,
  routes: readonly Route[],
  outputDir: string,
): Readonly<GeneratedFile | null> => {
  const backendRoutes = routes.filter((route) => route.kind === 'backend');
  if (backendRoutes.length === 0) {
    return null;
  }

  const selectedFramework = backendFramework(framework);

  return Object.freeze({
    path: `${outputDir}/${toSafeFileName(selectedFramework)}.generated.routes.ts`,
    content: loadBackendTemplate(selectedFramework, backendRoutes),
  });
};
