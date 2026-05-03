export type EnvironmentName = 'dev' | 'test' | 'prod';

export interface EnvVariable {
  key: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
  pattern?: RegExp;
  allowedValues?: readonly string[];
  sensitive?: boolean;
}

export interface EnvSchema {
  environment: EnvironmentName;
  variables: ReadonlyArray<EnvVariable>;
}

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  errors: string[];
}

export interface EnvGenerationResult {
  success: boolean;
  created: boolean;
  updated: boolean;
  missing: string[];
  invalid: string[];
  logs: string[];
  error?: string;
}

export interface EnvOrchestratorInput {
  environment?: EnvironmentName;
  cwd?: string;
}

export interface EnvRuntimeState {
  env: Record<string, string>;
  schema: EnvSchema | null;
  missing: string[];
  invalid: string[];
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  logs: string[];
  errors: string[];
}
