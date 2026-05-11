import type { Response } from 'express';
import { v4 as uuid } from 'uuid';
import type {
  WatchClient, WatchEvent, WatchEventType, BroadcastResult,
  WatcherSnapshot, WatcherServiceConfig,
} from './watcher.types.ts';

const DEFAULT_CONFIG: WatcherServiceConfig = {
  pingIntervalMs: 20_000,
  clientTimeoutMs: 60_000,
  debounceMs: 150,
};

export class WatcherService {
  private clients = new Map<string, WatchClient>();
  private config: WatcherServiceConfig;
  private pingTimer?: ReturnType<typeof setInterval>;
  private debounceMap = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(config?: Partial<WatcherServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPingLoop();
  }

  registerClient(res: Response, projectId: string): WatchClient {
    const id = uuid();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const client: WatchClient = {
      id, projectId, res,
      connectedAt: new Date(),
      lastPingAt: new Date(),
    };

    this.clients.set(id, client);

    this.sendToClient(client, { type: 'ping', path: '', projectId, timestamp: new Date() });

    res.on('close', () => this.removeClient(id));
    return client;
  }

  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;
    try { client.res.end(); } catch {}
    this.clients.delete(id);
  }

  broadcast(event: WatchEvent): BroadcastResult {
    const targets = Array.from(this.clients.values()).filter(
      c => !event.projectId || c.projectId === event.projectId
    );

    let sent = 0;
    for (const client of targets) {
      if (this.sendToClient(client, event)) sent++;
    }

    return { ok: true, sent, projectId: event.projectId };
  }

  broadcastDebounced(event: WatchEvent): void {
    const key = `${event.projectId}::${event.path}::${event.type}`;
    const existing = this.debounceMap.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.broadcast(event);
      this.debounceMap.delete(key);
    }, this.config.debounceMs);

    this.debounceMap.set(key, timer);
  }

  notifyFileChange(type: WatchEventType, filePath: string, projectId: string, oldPath?: string): BroadcastResult {
    const event: WatchEvent = {
      type, path: filePath, oldPath, projectId,
      timestamp: new Date(),
    };
    this.broadcastDebounced(event);
    return { ok: true, sent: 0, projectId };
  }

  getSnapshot(): WatcherSnapshot {
    const byProject: Record<string, number> = {};
    for (const client of this.clients.values()) {
      byProject[client.projectId] = (byProject[client.projectId] ?? 0) + 1;
    }
    return {
      clientCount: this.clients.size,
      byProject,
      watchedPaths: Object.keys(byProject),
    };
  }

  getClientCount(projectId?: string): number {
    if (!projectId) return this.clients.size;
    return Array.from(this.clients.values()).filter(c => c.projectId === projectId).length;
  }

  private sendToClient(client: WatchClient, event: WatchEvent): boolean {
    try {
      const id = uuid();
      const data = JSON.stringify({ ...event, timestamp: event.timestamp.toISOString() });
      client.res.write(`id: ${id}\ndata: ${data}\n\n`);
      return true;
    } catch {
      this.removeClient(client.id);
      return false;
    }
  }

  private startPingLoop(): void {
    this.pingTimer = setInterval(() => {
      const now = Date.now();
      for (const client of this.clients.values()) {
        const age = now - client.lastPingAt.getTime();
        if (age > this.config.clientTimeoutMs) {
          this.removeClient(client.id);
          continue;
        }
        this.sendToClient(client, { type: 'ping', path: '', projectId: client.projectId, timestamp: new Date() });
        this.clients.set(client.id, { ...client, lastPingAt: new Date() });
      }
    }, this.config.pingIntervalMs);
  }

  dispose(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    for (const timer of this.debounceMap.values()) clearTimeout(timer);
    for (const client of this.clients.values()) {
      try { client.res.end(); } catch {}
    }
    this.clients.clear();
    this.debounceMap.clear();
  }
}

export const watcherService = new WatcherService();
