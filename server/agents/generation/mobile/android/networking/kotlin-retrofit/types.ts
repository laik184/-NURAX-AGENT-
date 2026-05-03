export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiEndpoint {
  readonly name: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly requiresAuth: boolean;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly retryableStatusCodes: readonly number[];
  readonly backoffMs: number;
}

export interface RetrofitConfig {
  readonly baseUrl: string;
  readonly connectTimeoutMs: number;
  readonly readTimeoutMs: number;
  readonly writeTimeoutMs: number;
  readonly converter: "gson" | "moshi";
  readonly token?: string;
  readonly enableLogging: boolean;
  readonly retryPolicy: RetryPolicy;
  readonly defaultHeaders?: Readonly<Record<string, string>>;
}

export interface RequestConfig {
  readonly endpoint: ApiEndpoint;
  readonly headers: Readonly<Record<string, string>>;
  readonly queryParams?: Readonly<Record<string, string | number | boolean>>;
  readonly body?: unknown;
}

export interface ResponseModel<T = unknown> {
  readonly data: T;
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly raw: unknown;
}

export interface NetworkError {
  readonly code: string;
  readonly message: string;
  readonly statusCode?: number;
  readonly details?: unknown;
  readonly retryable: boolean;
}

export type NetworkingStatus = "IDLE" | "READY" | "ERROR";

export interface KotlinRetrofitState {
  readonly baseUrl: string;
  readonly endpoints: readonly ApiEndpoint[];
  readonly headers: readonly Readonly<Record<string, string>>[];
  readonly interceptors: readonly string[];
  readonly status: NetworkingStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface InterceptorDefinition {
  readonly name: string;
  readonly type: "request" | "response";
  readonly description: string;
}

export interface ApiInterface {
  readonly endpoints: readonly ApiEndpoint[];
  readonly annotations: Readonly<Record<string, string>>;
}

export interface RetrofitClient {
  readonly baseUrl: string;
  readonly converterFactory: "GsonConverterFactory" | "MoshiConverterFactory";
  readonly timeouts: Readonly<{
    connectMs: number;
    readMs: number;
    writeMs: number;
  }>;
  readonly interceptors: readonly InterceptorDefinition[];
  readonly retryPolicy: RetryPolicy;
}

export interface KotlinRetrofitOutput {
  readonly success: boolean;
  readonly client: object;
  readonly endpoints: readonly ApiEndpoint[];
  readonly logs: readonly string[];
  readonly error?: string;
}
