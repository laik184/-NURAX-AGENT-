import type { GeneratedMethodModel, ValidationMode } from '../types.js';

const validationLine = (mode: ValidationMode): string => {
  if (mode === 'joi') {
    return 'this.validator.assertWithJoi(input);';
  }

  if (mode === 'class-validator') {
    return 'await this.validator.assertWithClassValidator(input);';
  }

  return 'this.validator.assertWithZod(input);';
};

export const validationInjectorAgent = {
  inject(methods: GeneratedMethodModel[], mode: ValidationMode, strictValidation = true): GeneratedMethodModel[] {
    if (!strictValidation) {
      return methods.map((method) => ({ ...method, body: [...method.body] }));
    }

    return methods.map((method) => ({
      ...method,
      body: [validationLine(mode), ...method.body],
    }));
  },
};
