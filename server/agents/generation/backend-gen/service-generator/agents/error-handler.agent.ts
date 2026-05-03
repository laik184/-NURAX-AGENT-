import type { GeneratedMethodModel } from '../types.js';

export const errorHandlerAgent = {
  wrap(methods: GeneratedMethodModel[]): GeneratedMethodModel[] {
    return methods.map((method) => ({
      ...method,
      body: [
        'try {',
        ...method.body.map((line) => `  ${line}`),
        '} catch (error) {',
        "  this.logger?.error?.('Service method failed', { method: '" + method.name + "', error });",
        "  throw new Error(`SERVICE_ERROR:" + method.name + "`);",
        '}',
      ],
    }));
  },
};
