export interface PlatformServiceInput {
  readonly operation: string;
  readonly args?: Record<string, unknown>;
  readonly context?: Record<string, unknown>;
}

export interface PlatformServiceResult<T = unknown> {
  readonly ok: boolean;
  readonly service: string;
  readonly operation: string;
  readonly data?: T;
  readonly error?: string;
}

export function ok<T>(service: string, operation: string, data: T): PlatformServiceResult<T> {
  return Object.freeze({ ok: true, service, operation, data });
}

export function fail(service: string, operation: string, error: string): PlatformServiceResult<never> {
  return Object.freeze({ ok: false, service, operation, error });
}
