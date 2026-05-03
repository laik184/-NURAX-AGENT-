import { buildValidation } from "./agents/validation-builder.agent.js";
import { generateForm } from "./orchestrator.js";
import type { FormSchema } from "./types.js";

export function validateFormSchema(schema: FormSchema): boolean {
  if (!schema.formId || !schema.title || !schema.submit.endpoint) {
    return false;
  }

  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    return false;
  }

  return schema.fields.every((field) => !!field.id && !!field.name && !!field.label && Array.isArray(field.validation));
}

export { generateForm, buildValidation };
