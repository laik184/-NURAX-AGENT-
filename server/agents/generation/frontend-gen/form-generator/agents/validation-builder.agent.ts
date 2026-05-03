import type { FormSchema } from "../types.js";
import { mapRuleForEngine } from "../utils/validation-mapper.util.js";

export function buildValidation(schema: FormSchema): string {
  const isZod = schema.validationEngine === "zod";
  const schemaStart = isZod ? "z.object({" : "yup.object({";
  const schemaEnd = "})";

  const fieldRules = schema.fields
    .map((field) => {
      const baseType = isZod ? "z.string()" : "yup.string()";
      const applied = field.validation.map((rule) => mapRuleForEngine(rule, schema.validationEngine)).join("");
      return `  ${field.name}: ${baseType}${applied},`;
    })
    .join("\n");

  return `${schemaStart}\n${fieldRules}\n${schemaEnd}`;
}
