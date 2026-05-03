import type { PageGenerationContext } from '../types';
import { toPascalCase } from '../utils/naming.util';
import { upsertFile } from '../utils/file-structure.util';
import { formatCode } from '../utils/code-formatter.util';
import { loadTemplateBundle } from '../utils/template-loader.util';
import { logStep } from '../utils/logger.util';

export function bindData(context: PageGenerationContext): PageGenerationContext {
  const pageComponent = `${toPascalCase(context.spec.pageName)}Page`;
  const template = loadTemplateBundle(context.spec.framework).pageTemplate
    .replace('{{PAGE_COMPONENT}}', pageComponent)
    .replace('{{HEADER}}', context.layout?.header ?? '<header />')
    .replace('{{BODY}}', context.layout?.body ?? '<section />')
    .replace('{{FOOTER}}', context.layout?.footer ?? '<footer />');

  const extension = context.spec.framework === 'vue' ? 'vue' : 'tsx';
  const pagePath = `pages/${pageComponent}.${extension}`;

  const files = upsertFile(context.files, {
    path: pagePath,
    content: formatCode(template),
  });

  logStep(context.logs, 'data-binding:page-bound');
  return {
    ...context,
    files,
  };
}
