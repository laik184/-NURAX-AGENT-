import type { DeployLogEntry, LogLevel } from "../../types.ts";

interface LogFilter {
  level?: LogLevel;
  search?: string;
  limit?: number;
  offset?: number;
}

class LogStore {
  private logs = new Map<number, DeployLogEntry[]>();
  private nextId = 1;

  append(deploymentId: number, level: LogLevel, message: string): DeployLogEntry {
    const entry: DeployLogEntry = {
      id: this.nextId++,
      deploymentId,
      ts: new Date().toTimeString().slice(0, 8),
      level,
      message,
    };
    if (!this.logs.has(deploymentId)) {
      this.logs.set(deploymentId, []);
    }
    this.logs.get(deploymentId)!.push(entry);
    return entry;
  }

  query(deploymentId: number, filter: LogFilter = {}): DeployLogEntry[] {
    const all = this.logs.get(deploymentId) ?? [];
    let result = all;

    if (filter.level) {
      result = result.filter((l) => l.level === filter.level);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q));
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 500;
    return result.slice(offset, offset + limit);
  }

  count(deploymentId: number): number {
    return (this.logs.get(deploymentId) ?? []).length;
  }

  clear(deploymentId: number): void {
    this.logs.delete(deploymentId);
  }

  levelCounts(deploymentId: number): Record<LogLevel, number> {
    const all = this.logs.get(deploymentId) ?? [];
    return {
      INFO: all.filter((l) => l.level === "INFO").length,
      SUCCESS: all.filter((l) => l.level === "SUCCESS").length,
      WARNING: all.filter((l) => l.level === "WARNING").length,
      ERROR: all.filter((l) => l.level === "ERROR").length,
    };
  }
}

export const logStore = new LogStore();
