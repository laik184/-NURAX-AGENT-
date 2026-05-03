export interface ProjectProcess {
  projectId: number;
  pid: number | null;
  status: "starting" | "running" | "stopped" | "crashed";
  command: string;
  args: string[];
  port: number;
  startedAt: number;
  exitCode: number | null;
  lastLines: string[];
}

export const MAX_LINE_BUFFER = 500;
export const PORT_RANGE_START = Number(process.env.SANDBOX_PORT_START || 4001);
export const PORT_RANGE_END = Number(process.env.SANDBOX_PORT_END || 4999);
