import type { PageGenerationContext } from '../types';
import { loadTemplateBundle } from '../utils/template-loader.util';
import { toPascalCase } from '../utils/naming.util';
import { upsertFile } from '../utils/file-structure.util';
import { formatCode } from '../utils/code-formatter.util';
import { logStep } from '../utils/logger.util';

export function integrateRouting(context: PageGenerationContext): PageGenerationContext {
  const pageComponent = `${toPascalCase(context.spec.pageName)}Page`;
  const routeTemplate = loadTemplateBundle(context.spec.framework).routeTemplate
    .replace('{{ROUTE_PATH}}', context.spec.routePath)
    .replace('{{PAGE_COMPONENT}}', pageComponent);

  const files = upsertFile(context.files, {
    path: `routing/${context.spec.pageName}.route.tsx`,
    content: formatCode(routeTemplate),
  });

  logStep(context.logs, 'routing-integrator:route-registered');
  return {
    ...context,
    files,
    routes: [context.spec.routePath],
  };
}
