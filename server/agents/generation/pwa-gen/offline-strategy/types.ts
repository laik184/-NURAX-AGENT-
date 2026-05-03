export type StrategyType =
  | 'network-first'
  | 'cache-first'
  | 'stale-while-revalidate';

export interface OfflineRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
}

export interface OfflineResponse {
  success: boolean;
  strategy: StrategyType;
  fromCache: boolean;
  fallbackUsed: boolean;
}

export interface StrategyExecutionContext {
  readonly networkAvailable: boolean;
  readonly cacheKeys: readonly string[];
}

export interface StrategyExecutionResult extends OfflineResponse {
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface OfflineStrategyInput {
  readonly request: OfflineRequest;
  readonly context: StrategyExecutionContext;
}

export interface OfflineStrategyOutput {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}
