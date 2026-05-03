import type { PageGenerationContext } from '../types';
import { toPascalCase } from '../utils/naming.util';
import { upsertFile } from '../utils/file-structure.util';
import { formatCode } from '../utils/code-formatter.util';
import { logStep } from '../utils/logger.util';

export function composeComponents(context: PageGenerationContext): PageGenerationContext {
  const componentNames = context.spec.components.map(component => toPascalCase(component.name));
  let files = [...context.files];

  for (const name of componentNames) {
    files = upsertFile(files, {
      path: `components/${name}.tsx`,
      content: formatCode(`export function ${name}() {\n  return <div>${name}</div>;\n}`),
    });
  }

  logStep(context.logs, 'component-composer:components-generated');
  return {
    ...context,
    components: componentNames,
    files,
  };
}
