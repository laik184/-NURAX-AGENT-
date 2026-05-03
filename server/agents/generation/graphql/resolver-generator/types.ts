export type ResolverStatus = 'IDLE' | 'GENERATING' | 'COMPLETE' | 'FAILED';

export type ResolverFn<TResult = unknown> = (
  parent: unknown,
  args: Record<string, unknown>,
  context: GraphQLContext,
  info: unknown,
) => Promise<TResult> | TResult;

export interface SubscriptionResolver {
  subscribe: ResolverFn<AsyncIterable<unknown> | unknown>;
  resolve?: ResolverFn;
}

export type QueryResolver = Record<string, ResolverFn>;
export type MutationResolver = Record<string, ResolverFn>;
export type FieldResolver = Record<string, ResolverFn>;

export type ResolverMap = Record<string, Record<string, ResolverFn | SubscriptionResolver>>;

export interface GraphQLContext {
  user?: {
    id: string;
    roles: ReadonlyArray<string>;
    permissions?: ReadonlyArray<string>;
  };
  db?: Record<string, unknown>;
  services?: Record<string, unknown>;
  loaders?: Record<string, unknown>;
  requestId?: string;
}

export interface ResolverConfig {
  schema: string | Record<string, unknown>;
  handlers?: Readonly<Record<string, ResolverFn>>;
  permissions?: Readonly<Record<string, ReadonlyArray<string>>>;
  loaderFactories?: Readonly<Record<string, (context: GraphQLContext) => unknown>>;
}

export interface ResolverGeneratorState {
  schema: string | Record<string, unknown>;
  resolvers: ResolverMap;
  status: ResolverStatus;
  logs: string[];
  errors: string[];
}

export interface ResolverGeneratorOutput {
  success: boolean;
  resolvers: ResolverMap;
  logs: string[];
  error?: string;
}
