import type { PageGenerationContext } from '../types';
import { loadTemplateBundle } from '../utils/template-loader.util';
import { logStep } from '../utils/logger.util';

export function buildLayout(context: PageGenerationContext): PageGenerationContext {
  const bundle = loadTemplateBundle(context.spec.framework);
  const layout = {
    header: '<header>Header</header>',
    body: '<section>Content</section>',
    footer: '<footer>Footer</footer>',
  };

  logStep(context.logs, 'layout-builder:layout-created');
  return {
    ...context,
    layout,
    files: [
      ...context.files,
      {
        path: `templates/${context.spec.pageName}.template.txt`,
        content: bundle.pageTemplate,
      },
    ],
  };
}
