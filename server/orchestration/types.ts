export interface RunInput {
  projectId: number;
  goal: string;
  mode?: "lite" | "economy" | "power" | "core" | "agent" | "pipeline";
  context?: Record<string, unknown>;
}

export interface RunHandle {
  runId: string;
  projectId: number;
  status: "running" | "success" | "failed" | "cancelled";
  startedAt: number;
}

export interface CodeFile {
  path: string;
  content: string;
}
