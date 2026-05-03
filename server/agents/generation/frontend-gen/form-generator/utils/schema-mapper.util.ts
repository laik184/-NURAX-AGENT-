import type { FieldConfig, FormSchema, ValidationRule } from "../types.js";

export function collectValidationRules(fields: readonly FieldConfig[]): readonly ValidationRule[] {
  return Object.freeze(fields.flatMap((field) => field.validation));
}

export function toStateShape(schema: FormSchema): {
  readonly formId: string;
  readonly fields: readonly FieldConfig[];
  readonly apiEndpoint: string;
  readonly validationRules: readonly ValidationRule[];
} {
  return Object.freeze({
    formId: schema.formId,
    fields: Object.freeze([...schema.fields]),
    apiEndpoint: schema.submit.endpoint,
    validationRules: collectValidationRules(schema.fields),
  });
}
