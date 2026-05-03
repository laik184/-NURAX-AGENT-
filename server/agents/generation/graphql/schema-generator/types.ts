export interface GraphQLField {
  readonly name: string;
  readonly type: string;
  readonly required?: boolean;
  readonly isList?: boolean;
  readonly listRequired?: boolean;
  readonly args?: readonly GraphQLField[];
  readonly description?: string;
}

export interface GraphQLType {
  readonly name: string;
  readonly fields: readonly GraphQLField[];
  readonly description?: string;
  readonly implements?: readonly string[];
}

export interface QueryDefinition {
  readonly name: string;
  readonly returnType: string;
  readonly args?: readonly GraphQLField[];
  readonly description?: string;
}

export interface MutationDefinition {
  readonly name: string;
  readonly returnType: string;
  readonly args?: readonly GraphQLField[];
  readonly description?: string;
}

export interface SubscriptionDefinition {
  readonly name: string;
  readonly returnType: string;
  readonly args?: readonly GraphQLField[];
  readonly description?: string;
}

export interface InterfaceDefinition {
  readonly name: string;
  readonly fields: readonly GraphQLField[];
  readonly description?: string;
}

export interface DirectiveArgument {
  readonly name: string;
  readonly type: string;
  readonly required?: boolean;
  readonly description?: string;
}

export interface DirectiveDefinition {
  readonly name: string;
  readonly locations: readonly string[];
  readonly args?: readonly DirectiveArgument[];
  readonly description?: string;
}

export interface SchemaConfig {
  readonly types?: readonly GraphQLType[];
  readonly queries?: readonly QueryDefinition[];
  readonly mutations?: readonly MutationDefinition[];
  readonly subscriptions?: readonly SubscriptionDefinition[];
  readonly scalars?: readonly string[];
  readonly interfaces?: readonly InterfaceDefinition[];
  readonly directives?: readonly DirectiveDefinition[];
}

export interface SchemaOutput {
  readonly success: boolean;
  readonly schema: string;
  readonly types: readonly GraphQLType[];
  readonly queries: readonly QueryDefinition[];
  readonly mutations: readonly MutationDefinition[];
  readonly subscriptions: readonly SubscriptionDefinition[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export type SchemaStatus = "IDLE" | "GENERATING" | "COMPLETE" | "FAILED";

export interface SchemaState {
  readonly types: readonly GraphQLType[];
  readonly queries: readonly QueryDefinition[];
  readonly mutations: readonly MutationDefinition[];
  readonly subscriptions: readonly SubscriptionDefinition[];
  readonly schema: string;
  readonly status: SchemaStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}
