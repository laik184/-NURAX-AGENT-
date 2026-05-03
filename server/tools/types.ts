export interface ToolContext {
  readonly projectId: number;
  readonly runId: string;
  readonly signal?: AbortSignal;
}

export interface ToolExecution {
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: string;
}

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolExecution>;
}
