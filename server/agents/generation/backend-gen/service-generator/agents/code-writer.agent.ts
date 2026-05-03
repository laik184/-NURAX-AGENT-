import type {
  DependencyInjectionModel,
  GeneratedMethodModel,
  GeneratedService,
  ServiceConfig,
  ServiceMethod,
} from '../types.js';
import { formatterUtil } from '../utils/formatter.util.js';
import { namingUtil } from '../utils/naming.util.js';
import { promptBuilderUtil } from '../utils/prompt-builder.util.js';
import { templateLoaderUtil } from '../utils/template-loader.util.js';

const indentBlock = (lines: string[], depth = 1): string[] => {
  const pad = '  '.repeat(depth);
  return lines.map((line) => `${pad}${line}`);
};

export const codeWriterAgent = {
  write(
    config: ServiceConfig,
    methods: GeneratedMethodModel[],
    plannedMethods: ServiceMethod[],
    injection: DependencyInjectionModel,
  ): GeneratedService {
    const className = namingUtil.serviceClassName(config.entityName);
    const fileName = namingUtil.serviceFileName(config.entityName);
    const headers = templateLoaderUtil.loadHeader(config.framework);

    const promptPreview = promptBuilderUtil.build(config, plannedMethods, config.dependencies ?? []);

    const methodBlocks = methods.flatMap((method) => [
      `  ${method.signature} {`,
      ...indentBlock(method.body, 2),
      '  }',
      '',
    ]);

    const lines = [
      ...headers,
      '',
      `// generation-prompt-preview: ${JSON.stringify(promptPreview)}`,
      `export class ${className} {`,
      `  private readonly repository = this.${namingUtil.repositoryPropertyName(config.entityName)} as any;`,
      '',
      `  constructor(${injection.constructorArgs.join(', ')}) {}`,
      '',
      ...methodBlocks,
      '}',
    ];

    const code = formatterUtil.toCodeBlock(lines);

    return {
      className,
      fileName,
      framework: config.framework,
      code,
      methods: plannedMethods,
      dependencies: config.dependencies ?? [],
    };
  },
};
