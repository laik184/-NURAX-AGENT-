import type { PageGenerationContext } from '../types';
import { upsertFile } from '../utils/file-structure.util';
import { formatCode } from '../utils/code-formatter.util';
import { logStep } from '../utils/logger.util';

export function integrateApi(context: PageGenerationContext): PageGenerationContext {
  const endpointLines = context.spec.apiEndpoints.map(endpoint => `  await fetch('${endpoint}');`).join('\n');
  const content = formatCode(`export async function loadPageData(): Promise<void> {\n${endpointLines || '  return;'}\n}`);
  const files = upsertFile(context.files, {
    path: `api/${context.spec.pageName}.api.ts`,
    content,
  });

  logStep(context.logs, 'api-integration:api-bound');
  return {
    ...context,
    files,
    apiCalls: [...context.spec.apiEndpoints],
  };
}
