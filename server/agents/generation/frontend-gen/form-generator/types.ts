export type ValidationEngine = "zod" | "yup" | "custom";

export type FieldType = "text" | "email" | "password" | "number" | "select" | "checkbox" | "textarea";

export interface ValidationRule {
  readonly type: "required" | "min" | "max" | "regex" | "async";
  readonly value?: string | number;
  readonly message: string;
  readonly validatorName?: string;
}

export interface FieldOption {
  readonly label: string;
  readonly value: string;
}

export interface FieldConfig {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly type: FieldType;
  readonly placeholder?: string;
  readonly section?: string;
  readonly defaultValue?: string | number | boolean;
  readonly options?: readonly FieldOption[];
  readonly validation: readonly ValidationRule[];
}

export interface SubmitConfig {
  readonly method: "POST" | "PUT" | "PATCH";
  readonly endpoint: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly successMessage?: string;
}

export interface FormSchema {
  readonly formId: string;
  readonly title: string;
  readonly description?: string;
  readonly validationEngine: ValidationEngine;
  readonly fields: readonly FieldConfig[];
  readonly submit: SubmitConfig;
}

export interface FormComponent {
  readonly success: boolean;
  readonly componentCode: string;
  readonly validationSchema: string;
  readonly apiConfig: Readonly<Record<string, unknown>>;
  readonly logs: readonly string[];
}

export interface FormGeneratorState {
  readonly formId: string;
  readonly fields: readonly FieldConfig[];
  readonly validationRules: readonly ValidationRule[];
  readonly apiEndpoint: string;
  readonly status: "IDLE" | "GENERATING" | "COMPLETE" | "FAILED";
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface FormGenerationArtifacts {
  readonly layout: string;
  readonly fieldsMarkup: string;
  readonly validationSchema: string;
  readonly submitHandler: string;
  readonly apiConfig: Readonly<Record<string, unknown>>;
  readonly errorMapping: string;
}
