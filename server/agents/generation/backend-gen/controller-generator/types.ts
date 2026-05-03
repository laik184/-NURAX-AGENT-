export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handlerName: string;
  readonly serviceMethod: string;
  readonly successStatusCode?: number;
}

export interface MethodDefinition {
  readonly name: string;
  readonly serviceMethod: string;
  readonly route: RouteDefinition;
  readonly requestParams: readonly string[];
  readonly requestQuery: readonly string[];
  readonly requestBody: readonly string[];
  readonly requestExtractCode: string;
  readonly validationKey?: string;
}

export interface ValidationSchema {
  readonly key: string;
  readonly location: "params" | "query" | "body";
  readonly required: readonly string[];
}

export interface ControllerConfig {
  readonly controllerName: string;
  readonly serviceName: string;
  readonly routes: readonly RouteDefinition[];
  readonly validations?: readonly ValidationSchema[];
  readonly frameworkTarget?: "express" | "nestjs" | "agnostic";
}

export interface GeneratedController {
  readonly success: boolean;
  readonly fileName: string;
  readonly code: string;
  readonly logs: readonly string[];
}

export type GeneratorStatus = "IDLE" | "GENERATING" | "DONE" | "FAILED";

export interface ControllerGeneratorState {
  readonly controllerName: string;
  readonly routes: readonly RouteDefinition[];
  readonly methods: readonly MethodDefinition[];
  readonly validations: readonly ValidationSchema[];
  readonly status: GeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}
