import type { PageGenerationContext } from '../types';
import { upsertFile } from '../utils/file-structure.util';
import { formatCode } from '../utils/code-formatter.util';
import { loadTemplateBundle } from '../utils/template-loader.util';
import { logStep } from '../utils/logger.util';

export function integrateState(context: PageGenerationContext): PageGenerationContext {
  const base = loadTemplateBundle(context.spec.framework).stateTemplate;
  const manager = context.spec.stateManager;
  const content = formatCode(`${base}\n\nexport const stateManager = '${manager}';`);

  const files = upsertFile(context.files, {
    path: `state/${context.spec.pageName}.state.ts`,
    content,
  });

  logStep(context.logs, 'state-integrator:state-configured');
  return {
    ...context,
    files,
  };
}
