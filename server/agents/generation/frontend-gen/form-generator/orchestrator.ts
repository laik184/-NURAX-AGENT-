import { buildApiIntegrationConfig, buildApiSubmissionAdapter } from "./agents/api-integration.agent.js";
import { buildErrorMapper } from "./agents/error-handler.agent.js";
import { generateFormStructure } from "./agents/form-structure.agent.js";
import { generateInputFields } from "./agents/input-field.agent.js";
import { buildSubmitHandler } from "./agents/submit-handler.agent.js";
import { buildValidation } from "./agents/validation-builder.agent.js";
import { getOrchestratorActorToken, mutateFormGeneratorState, resetFormGeneratorState } from "./state.js";
import type { FormComponent, FormSchema } from "./types.js";
import { buildComponentTemplate } from "./utils/component-template.util.js";
import { formatCodeBlock, formatLog } from "./utils/formatter.util.js";
import { toStateShape } from "./utils/schema-mapper.util.js";

export function generateForm(schema: FormSchema): FormComponent {
  const actor = getOrchestratorActorToken();
  const logs: string[] = [];

  resetFormGeneratorState(actor);
  mutateFormGeneratorState(actor, {
    ...toStateShape(schema),
    status: "GENERATING",
    logs,
    errors: Object.freeze([]),
  });

  try {
    logs.push(formatLog("schema", `received ${schema.fields.length} fields`));
    const layout = generateFormStructure(schema);

    logs.push(formatLog("fields", "generated field component markup"));
    const fieldsMarkup = generateInputFields(schema);

    logs.push(formatLog("validation", "generated validation schema"));
    const validationSchema = buildValidation(schema);

    logs.push(formatLog("submit", "generated submit handler"));
    const submitHandler = buildSubmitHandler(schema);

    logs.push(formatLog("api", "generated API adapter config"));
    const apiConfig = buildApiIntegrationConfig(schema);
    const apiSubmissionAdapter = buildApiSubmissionAdapter(apiConfig);

    logs.push(formatLog("errors", "generated UI error mapper"));
    const errorMapping = buildErrorMapper();

    const componentCode = formatCodeBlock(
      buildComponentTemplate({
        formId: schema.formId,
        title: schema.title,
        description: schema.description,
        layoutMarkup: layout,
        fieldsMarkup,
        submitHandlerCode: `${apiSubmissionAdapter}\n\n${submitHandler}`,
        errorMappingCode: errorMapping,
        validationSchema,
      }),
    );

    const output = Object.freeze({
      success: true,
      componentCode,
      validationSchema,
      apiConfig,
      logs: Object.freeze([...logs]),
    });

    mutateFormGeneratorState(actor, {
      status: "COMPLETE",
      logs: output.logs,
    });

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    const failureLog = formatLog("alert", message);
    logs.push(failureLog);

    mutateFormGeneratorState(actor, {
      status: "FAILED",
      logs: Object.freeze([...logs]),
      errors: Object.freeze([message]),
    });

    return Object.freeze({
      success: false,
      componentCode: "",
      validationSchema: "",
      apiConfig: Object.freeze({ endpoint: schema.submit.endpoint }),
      logs: Object.freeze([...logs]),
    });
  }
}
