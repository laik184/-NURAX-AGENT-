export type GeneratorStatus = "IDLE" | "GENERATING" | "COMPLETE" | "FAILED";

export type MongooseScalarType =
  | "String"
  | "Number"
  | "Boolean"
  | "Date"
  | "Buffer"
  | "Mixed"
  | "ObjectId"
  | "Decimal128"
  | "Map"
  | "UUID";

export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

export interface EnumValidation {
  readonly values: readonly string[];
}

export interface RangeValidation {
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
}

export interface FieldValidation {
  readonly required?: boolean | readonly [boolean, string];
  readonly unique?: boolean;
  readonly enum?: EnumValidation;
  readonly range?: RangeValidation;
  readonly match?: string;
  readonly validate?: string;
  readonly trim?: boolean;
  readonly lowercase?: boolean;
  readonly uppercase?: boolean;
}

export interface FieldDefinition {
  readonly name: string;
  readonly type: string;
  readonly isArray: boolean;
  readonly isOptional: boolean;
  readonly defaultValue?: unknown;
  readonly validation?: FieldValidation;
  readonly ref?: string;
  readonly comment?: string;
}

export interface RelationDefinition {
  readonly fieldName: string;
  readonly refModel: string;
  readonly type: RelationType;
  readonly localField?: string;
  readonly foreignField?: string;
  readonly isArray: boolean;
  readonly onDelete?: "cascade" | "nullify" | "restrict";
}

export interface IndexConfig {
  readonly fields: Readonly<Record<string, 1 | -1 | "text" | "2dsphere">>;
  readonly unique?: boolean;
  readonly sparse?: boolean;
  readonly background?: boolean;
  readonly name?: string;
  readonly expireAfterSeconds?: number;
}

export interface SchemaConfig {
  readonly name: string;
  readonly fields: readonly FieldDefinition[];
  readonly relations?: readonly RelationDefinition[];
  readonly indexes?: readonly IndexConfig[];
  readonly timestamps?: boolean;
  readonly strict?: boolean;
  readonly collection?: string;
  readonly versionKey?: boolean;
}

export interface SchemaResult {
  readonly success: boolean;
  readonly schema: string;
  readonly indexes: readonly IndexConfig[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface MongooseSchemaState {
  readonly schemaName: string;
  readonly fields: readonly FieldDefinition[];
  readonly relations: readonly RelationDefinition[];
  readonly indexes: readonly IndexConfig[];
  readonly status: GeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface StatePatch {
  readonly schemaName?: string;
  readonly fields?: readonly FieldDefinition[];
  readonly relations?: readonly RelationDefinition[];
  readonly indexes?: readonly IndexConfig[];
  readonly status?: GeneratorStatus;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface AgentResult {
  readonly nextState: Readonly<MongooseSchemaState>;
  readonly output: Readonly<SchemaResult>;
}
