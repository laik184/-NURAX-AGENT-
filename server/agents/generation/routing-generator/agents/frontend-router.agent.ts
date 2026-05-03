import type { FrameworkType, GeneratedFile, Route } from '../types.js';
import { toSafeFileName } from '../utils/naming.util.js';
import { loadFrontendTemplate } from '../utils/template-loader.util.js';

const frontendFramework = (framework: FrameworkType): FrameworkType => {
  if (framework === 'react-router' || framework === 'nextjs' || framework === 'vue-router') {
    return framework;
  }
  return 'react-router';
};

export const generateFrontendRouter = (
  framework: FrameworkType,
  routes: readonly Route[],
  outputDir: string,
): Readonly<GeneratedFile | null> => {
  const frontendRoutes = routes.filter((route) => route.kind === 'frontend');
  if (frontendRoutes.length === 0) {
    return null;
  }

  const selectedFramework = frontendFramework(framework);

  return Object.freeze({
    path: `${outputDir}/${toSafeFileName(selectedFramework)}.generated.routes.ts`,
    content: loadFrontendTemplate(selectedFramework, frontendRoutes),
  });
};
