export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head";

export interface RouteMeta {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly handlerName: string;
  readonly filePath: string;
  readonly tags: readonly string[];
  readonly queryParams: readonly string[];
  readonly pathParams: readonly string[];
  readonly requestTypeName?: string;
  readonly responseTypeName?: string;
}

export type SchemaFieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "unknown";

export interface SchemaFieldMeta {
  readonly name: string;
  readonly type: SchemaFieldType;
  readonly required: boolean;
  readonly rawType: string;
}

export interface SchemaMeta {
  readonly name: string;
  readonly sourceFile: string;
  readonly kind: "interface" | "type" | "class";
  readonly fields: readonly SchemaFieldMeta[];
}

export interface ParameterDoc {
  readonly name: string;
  readonly in: "query" | "path";
  readonly required: boolean;
  readonly schema: { readonly type: string };
}

export interface RequestDoc {
  readonly routeId: string;
  readonly parameters: readonly ParameterDoc[];
  readonly requestBody?: {
    readonly required: boolean;
    readonly content: {
      readonly "application/json": {
        readonly schema: unknown;
        readonly example?: unknown;
      };
    };
  };
}

export interface ResponseDoc {
  readonly routeId: string;
  readonly responses: Readonly<Record<string, {
    readonly description: string;
    readonly content?: {
      readonly "application/json": {
        readonly schema: unknown;
        readonly example?: unknown;
      };
    };
  }>>;
}

export interface OpenAPISpec {
  readonly openapi: "3.0.3";
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly paths: Record<string, Record<string, unknown>>;
  readonly components: {
    readonly schemas: Record<string, unknown>;
  };
  readonly tags: readonly { readonly name: string }[];
}

export interface GeneratedApiDocsOutput {
  readonly success: boolean;
  readonly openapi: OpenAPISpec | Record<string, never>;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface GenerateApiDocsInput {
  readonly rootDir: string;
  readonly title?: string;
  readonly version?: string;
  readonly description?: string;
}
