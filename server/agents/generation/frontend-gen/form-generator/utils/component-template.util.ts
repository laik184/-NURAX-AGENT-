export interface BuildComponentTemplateInput {
  readonly formId: string;
  readonly title: string;
  readonly description?: string;
  readonly layoutMarkup: string;
  readonly fieldsMarkup: string;
  readonly submitHandlerCode: string;
  readonly errorMappingCode: string;
  readonly validationSchema: string;
}

export function buildComponentTemplate(input: BuildComponentTemplateInput): string {
  const descriptionLine = input.description ? `<p>${input.description}</p>` : "";

  return `
import { useMemo, useState } from "react";

export function ${input.formId}Form() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validationSchema = useMemo(() => (${input.validationSchema}), []);

${input.submitHandlerCode}
${input.errorMappingCode}

  return (
    <form id="${input.formId}" onSubmit={handleSubmit}>
      <header>
        <h2>${input.title}</h2>
        ${descriptionLine}
      </header>
      ${input.layoutMarkup}
      ${input.fieldsMarkup}
      <button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
      {success && <p role="status">Form submitted successfully.</p>}
    </form>
  );
}
`.trim();
}
