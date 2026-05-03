export type DatabaseProvider = "postgresql" | "mysql" | "sqlite" | "sqlserver" | "mongodb";

export type GeneratorStatus = "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";

export type FieldType =
  | "String"
  | "Int"
  | "BigInt"
  | "Float"
  | "Decimal"
  | "Boolean"
  | "DateTime"
  | "Json"
  | "Bytes";

export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

export interface FieldAttribute {
  readonly name: string;
  readonly args?: readonly string[];
}

export interface FieldDefinition {
  readonly name: string;
  readonly type: string;
  readonly isOptional: boolean;
  readonly isList: boolean;
  readonly attributes: readonly FieldAttribute[];
  readonly defaultValue?: string;
  readonly comment?: string;
}

export interface ModelDefinition {
  readonly name: string;
  readonly fields: readonly FieldDefinition[];
  readonly attributes: readonly string[];
  readonly comment?: string;
}

export interface RelationDefinition {
  readonly name?: string;
  readonly fromModel: string;
  readonly toModel: string;
  readonly type: RelationType;
  readonly fromField?: string;
  readonly toField?: string;
  readonly onDelete?: "Cascade" | "SetNull" | "Restrict" | "NoAction" | "SetDefault";
  readonly onUpdate?: "Cascade" | "SetNull" | "Restrict" | "NoAction" | "SetDefault";
}

export interface EnumValue {
  readonly name: string;
  readonly comment?: string;
}

export interface EnumDefinition {
  readonly name: string;
  readonly values: readonly EnumValue[];
  readonly comment?: string;
}

export interface DatasourceConfig {
  readonly provider: DatabaseProvider;
  readonly url: string;
  readonly shadowDatabaseUrl?: string;
  readonly relationMode?: "prisma" | "foreignKeys";
}

export interface GeneratorConfig {
  readonly provider: string;
  readonly output?: string;
  readonly previewFeatures?: readonly string[];
  readonly binaryTargets?: readonly string[];
}

export interface PrismaSchema {
  readonly datasource: DatasourceConfig;
  readonly generator: GeneratorConfig;
  readonly models: readonly ModelDefinition[];
  readonly enums: readonly EnumDefinition[];
  readonly relations: readonly RelationDefinition[];
}

export interface GenerationInput {
  readonly models: readonly ModelDefinition[];
  readonly enums?: readonly EnumDefinition[];
  readonly relations?: readonly RelationDefinition[];
  readonly datasource?: Partial<DatasourceConfig>;
  readonly generator?: Partial<GeneratorConfig>;
}

export interface GenerationResult {
  readonly success: boolean;
  readonly schema: string;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
  readonly level: "ERROR" | "WARNING";
}

export interface SchemaGeneratorState {
  readonly models: readonly ModelDefinition[];
  readonly relations: readonly RelationDefinition[];
  readonly enums: readonly EnumDefinition[];
  readonly datasource: Partial<DatasourceConfig>;
  readonly generator: Partial<GeneratorConfig>;
  readonly status: GeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface StatePatch {
  readonly models?: readonly ModelDefinition[];
  readonly relations?: readonly RelationDefinition[];
  readonly enums?: readonly EnumDefinition[];
  readonly datasource?: Partial<DatasourceConfig>;
  readonly generator?: Partial<GeneratorConfig>;
  readonly status?: GeneratorStatus;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface AgentResult {
  readonly nextState: Readonly<SchemaGeneratorState>;
  readonly output: Readonly<GenerationResult>;
}
