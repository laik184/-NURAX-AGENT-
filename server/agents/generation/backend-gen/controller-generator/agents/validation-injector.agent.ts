import type { MethodDefinition, ValidationSchema } from "../types.js";

export function injectValidations(
  methods: readonly MethodDefinition[],
  validations: readonly ValidationSchema[],
): readonly MethodDefinition[] {
  const validationMap = new Map(validations.map((schema) => [schema.key, schema]));

  return Object.freeze(
    methods.map((method) => {
      const validationKey = method.name;
      return Object.freeze({
        ...method,
        validationKey: validationMap.has(validationKey) ? validationKey : undefined,
      });
    }),
  );
}

export function buildValidationCode(schemas: readonly ValidationSchema[]): string {
  const entries = schemas.map((schema) => {
    const required = JSON.stringify(schema.required);
    return `  ${JSON.stringify(schema.key)}: { location: ${JSON.stringify(schema.location)}, required: ${required} }`;
  });

  return ["const validationSchemas = Object.freeze({", ...entries, "});"].join("\n");
}
