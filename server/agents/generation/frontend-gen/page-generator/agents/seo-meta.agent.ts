import type { PageGenerationContext } from '../types';
import { loadTemplateBundle } from '../utils/template-loader.util';
import { upsertFile } from '../utils/file-structure.util';
import { formatCode } from '../utils/code-formatter.util';
import { logStep } from '../utils/logger.util';

export function integrateSeoMeta(context: PageGenerationContext): PageGenerationContext {
  const title = context.spec.seo?.title ?? `${context.spec.pageName} | Generated Page`;
  const description = context.spec.seo?.description ?? `${context.spec.pageName} generated page`;
  const rawTemplate = loadTemplateBundle(context.spec.framework).seoTemplate;
  const content = formatCode(`${rawTemplate.replace('{{TITLE}}', title)}\nexport const pageDescription = '${description}';`);

  const files = upsertFile(context.files, {
    path: `seo/${context.spec.pageName}.seo.ts`,
    content,
  });

  logStep(context.logs, 'seo-meta:seo-generated');
  return {
    ...context,
    files,
  };
}
