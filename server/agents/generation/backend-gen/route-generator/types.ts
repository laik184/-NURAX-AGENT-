export type SupportedFramework = "express" | "nestjs";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint {
  name: string;
  path: string;
  method: string;
  controller: string;
  action: string;
}

export interface RouteConfig {
  framework: SupportedFramework;
  endpoints: Endpoint[];
  outputDir?: string;
}

export interface GeneratedRoute {
  endpoint: Endpoint;
  method: HttpMethod;
  normalizedPath: string;
  routeName: string;
  frameworkCode: string;
}

export interface RouteResult {
  success: boolean;
  files: string[];
  routes: GeneratedRoute[];
  logs: string[];
  error?: string;
}

export interface RouteGeneratorState {
  routes: GeneratedRoute[];
  framework: SupportedFramework;
  generatedFiles: string[];
  status: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
  logs: string[];
  errors: string[];
}
