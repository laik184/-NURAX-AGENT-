export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface EndpointConfig {
  readonly name: string;
  readonly path: string;
  readonly method: HttpMethod;
  readonly requiresAuth?: boolean;
  readonly queryParams?: readonly string[];
  readonly requestBodyType?: string;
  readonly responseType: string;
}

export interface RequestConfig {
  readonly baseURL: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timeoutSeconds?: number;
}

export interface ResponseModel {
  readonly endpointName: string;
  readonly responseType: string;
}

export interface NetworkError {
  readonly code: "invalidURL" | "httpError" | "decodingError" | "networkFailure" | "unknown";
  readonly message: string;
  readonly statusCode?: number;
}

export interface APIClient {
  readonly className: string;
  readonly sessionConfig?: "shared" | "custom";
}

export interface NetworkingGenerationInput {
  readonly baseURL: string;
  readonly endpoints: readonly EndpointConfig[];
  readonly headers?: Readonly<Record<string, string>>;
  readonly authToken?: string;
  readonly timeoutSeconds?: number;
  readonly apiClient?: Readonly<APIClient>;
}

export interface GeneratedFile {
  readonly name: string;
  readonly content: string;
}

export interface NetworkingOutput {
  readonly success: boolean;
  readonly files: readonly GeneratedFile[];
  readonly logs: readonly string[];
  readonly error?: string;
}
