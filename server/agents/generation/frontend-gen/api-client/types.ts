export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type HttpClientType = "fetch" | "axios";

export interface Endpoint {
  readonly path: string;
  readonly method: HttpMethod;
  readonly operationId: string;
  readonly requiresAuth: boolean;
  readonly queryParams: readonly string[];
  readonly pathParams: readonly string[];
  readonly hasBody: boolean;
}

export interface ApiRequest {
  readonly endpoint: Endpoint;
  readonly client: HttpClientType;
  readonly baseHeaders: Readonly<Record<string, string>>;
  readonly authHeader: Readonly<Record<string, string>>;
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly status: number;
  readonly data: T | null;
  readonly error: string | null;
}

export interface ClientConfig {
  readonly client: HttpClientType;
  readonly baseUrlVariable: string;
  readonly authTokenAccessor?: string;
  readonly defaultHeaders?: Readonly<Record<string, string>>;
}

export interface GeneratedFile {
  readonly name: string;
  readonly content: string;
}

export interface GenerationResult {
  readonly success: boolean;
  readonly files: readonly GeneratedFile[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface ApiClientState {
  readonly endpoints: readonly Endpoint[];
  readonly generatedFiles: readonly GeneratedFile[];
  readonly status: "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface GenerationInput {
  readonly schema: unknown;
  readonly config: ClientConfig;
}

export interface RequestTemplate {
  readonly functionName: string;
  readonly pathTemplate: string;
  readonly method: HttpMethod;
  readonly headers: Readonly<Record<string, string>>;
  readonly requiresAuth: boolean;
  readonly queryParams: readonly string[];
  readonly pathParams: readonly string[];
  readonly hasBody: boolean;
}

export interface ParsedEndpointCollection {
  readonly endpoints: readonly Endpoint[];
  readonly logs: readonly string[];
}
