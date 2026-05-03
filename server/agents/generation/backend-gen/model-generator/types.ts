export type SupportedOrm = "prisma" | "sequelize" | "typeorm" | "mongoose";

export type GeneratorStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";

export interface FieldDefinition {
  readonly name: string;
  readonly type: string;
  readonly primary?: boolean;
  readonly unique?: boolean;
  readonly required?: boolean;
  readonly default?: string | number | boolean | null;
}

export type RelationType = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

export interface RelationDefinition {
  readonly name: string;
  readonly type: RelationType;
  readonly target: string;
  readonly foreignKey?: string;
  readonly through?: string;
}

export interface ConstraintDefinition {
  readonly field: string;
  readonly primary?: boolean;
  readonly unique?: boolean;
  readonly required?: boolean;
}

export interface IndexDefinition {
  readonly name?: string;
  readonly fields: readonly string[];
  readonly unique?: boolean;
}

export interface ModelSchema {
  readonly name: string;
  readonly fields: readonly FieldDefinition[];
  readonly relations: readonly RelationDefinition[];
  readonly indexes: readonly IndexDefinition[];
}

export interface ParsedSchema {
  readonly modelName: string;
  readonly fields: readonly FieldDefinition[];
  readonly relations: readonly RelationDefinition[];
  readonly indexes: readonly IndexDefinition[];
}

export interface ModelBuildArtifact {
  readonly modelName: string;
  readonly fields: readonly FieldDefinition[];
  readonly relations: readonly RelationDefinition[];
  readonly constraints: readonly ConstraintDefinition[];
  readonly indexes: readonly IndexDefinition[];
}

export interface ModelGeneratorState {
  readonly modelName: string;
  readonly parsedSchema: ParsedSchema | null;
  readonly relations: readonly RelationDefinition[];
  readonly constraints: readonly ConstraintDefinition[];
  readonly indexes: readonly IndexDefinition[];
  readonly generatedCode: string;
  readonly status: GeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface ModelOutput {
  readonly success: boolean;
  readonly modelName: string;
  readonly code: string;
  readonly orm: SupportedOrm;
  readonly logs: readonly string[];
  readonly error?: string;
}
