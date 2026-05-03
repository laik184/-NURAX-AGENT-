import type { GeneratedMethodModel, ServiceMethod } from '../types.js';

const operationBody = (method: ServiceMethod): string[] => {
  if (method.operation === 'find') {
    return ['const result = await this.repository.findById(input);', 'return result;'];
  }

  if (method.operation === 'delete') {
    return ['await this.repository.deleteById(input);', 'return true;'];
  }

  return ['const result = await this.repository.save(input);', `return result as unknown as ${method.outputType};`];
};

export const methodGeneratorAgent = {
  generate(methods: ServiceMethod[]): GeneratedMethodModel[] {
    return methods.map((method) => ({
      name: method.name,
      signature: `async ${method.name}(input: ${method.inputType}): Promise<${method.outputType}>`,
      body: operationBody(method),
    }));
  },
};
