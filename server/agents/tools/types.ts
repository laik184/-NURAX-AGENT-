export interface ToolContext {
  projectId: number;
  runId: string;
  signal?: AbortSignal;
}

export interface ToolResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};
