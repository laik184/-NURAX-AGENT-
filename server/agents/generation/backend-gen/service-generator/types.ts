export type SupportedFramework = 'express' | 'nest' | 'fastapi';
export type ValidationMode = 'zod' | 'joi' | 'class-validator';

export interface ServiceMethod {
  name: string;
  operation: 'create' | 'update' | 'delete' | 'find' | 'custom';
  inputType: string;
  outputType: string;
  description: string;
  dependencies?: string[];
}

export interface DependencyConfig {
  name: string;
  type: 'repository' | 'service' | 'client';
  token?: string;
  requiredMethods?: string[];
}

export interface ServiceConfig {
  entityName: string;
  framework: SupportedFramework;
  validation: ValidationMode;
  includeCrud: boolean;
  customMethods?: Array<Omit<ServiceMethod, 'operation'> & { operation?: 'custom' }>;
  dependencies?: DependencyConfig[];
  strictValidation?: boolean;
}


export interface GeneratedMethodModel {
  name: string;
  signature: string;
  body: string[];
}

export interface GeneratedService {
  className: string;
  fileName: string;
  framework: SupportedFramework;
  code: string;
  methods: ServiceMethod[];
  dependencies: DependencyConfig[];
}

export type GenerationStatus = 'IDLE' | 'GENERATING' | 'SUCCESS' | 'FAILED';

export interface ServiceGeneratorLog {
  timestamp: string;
  stage: string;
  message: string;
}


export interface DependencyInjectionModel {
  readonly properties: string[];
  readonly constructorArgs: string[];
}

export interface ServiceGeneratorState {
  entityName: string;
  methods: ServiceMethod[];
  dependencies: DependencyConfig[];
  status: GenerationStatus;
  logs: ServiceGeneratorLog[];
  errors: string[];
}

export interface ServiceGenerationOutput {
  success: boolean;
  code: string;
  fileName: string;
  logs: ServiceGeneratorLog[];
  error?: string;
}
