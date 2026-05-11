import type { Response } from 'express';
import { v4 as uuid } from 'uuid';
import type {
  ConsoleLog, NetworkRequest, SseClient, SseChannel,
  SseMessage, BroadcastResult, DevtoolsSnapshot, DevtoolsServiceConfig,
  LogLevel,
} from './devtools.types.ts';

const DEFAULT_CONFIG: DevtoolsServiceConfig = {
  maxLogBuffer: 500,
  pingIntervalMs: 25_000,
  clientTimeoutMs: 60_000,
};

export class DevtoolsService {
  private clients = new Map<string, SseClient>();
  private consoleLogs: ConsoleLog[] = [];
  private networkRequests: NetworkRequest[] = [];
  private config: DevtoolsServiceConfig;
  private pingTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<DevtoolsServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPingLoop();
  }

  registerClient(res: Response, channel: SseChannel, projectId?: string): SseClient {
    const id = uuid();
    const client: SseClient = {
      id, channel, res, projectId,
      connectedAt: new Date(),
      lastPingAt: new Date(),
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.clients.set(id, client);

    if (channel === 'console' && this.consoleLogs.length > 0) {
      const recent = this.consoleLogs.slice(-20);
      for (const log of recent) this.sendToClient(client, { type: 'console', data: log });
    }

    res.on('close', () => this.removeClient(id));
    return client;
  }

  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;
    try { client.res.end(); } catch {}
    this.clients.delete(id);
  }

  broadcast(message: SseMessage, channel?: SseChannel): BroadcastResult {
    const targets = channel
      ? Array.from(this.clients.values()).filter(c => c.channel === channel)
      : Array.from(this.clients.values());

    let sent = 0;
    for (const client of targets) {
      const ok = this.sendToClient(client, message);
      if (ok) sent++;
    }

    return { ok: true, sent, channel: channel ?? 'console' };
  }

  pushConsoleLog(log: Omit<ConsoleLog, 'id' | 'time'>): ConsoleLog {
    const entry: ConsoleLog = {
      ...log,
      id: uuid(),
      time: new Date().toLocaleTimeString(),
    };
    this.consoleLogs.push(entry);
    if (this.consoleLogs.length > this.config.maxLogBuffer) {
      this.consoleLogs.shift();
    }
    this.broadcast({ type: 'console', data: entry }, 'console');
    return entry;
  }

  pushNetworkRequest(req: Omit<NetworkRequest, 'id' | 'time'>): NetworkRequest {
    const entry: NetworkRequest = {
      ...req,
      id: uuid(),
      time: new Date().toLocaleTimeString(),
    };
    this.networkRequests.push(entry);
    if (this.networkRequests.length > this.config.maxLogBuffer) {
      this.networkRequests.shift();
    }
    return entry;
  }

  signalReload(): void {
    this.broadcast({ type: 'reload', data: { ts: Date.now() } }, 'reload');
    this.broadcast({ type: 'done', data: { ts: Date.now() } }, 'console');
  }

  getSnapshot(): DevtoolsSnapshot {
    const byChannel = { console: 0, preview: 0, reload: 0 } as Record<SseChannel, number>;
    for (const c of this.clients.values()) byChannel[c.channel]++;
    return {
      consoleLogs: this.consoleLogs.slice(-50),
      networkRequests: this.networkRequests.slice(-50),
      clientCount: this.clients.size,
      byChannel,
    };
  }

  clearLogs(): void {
    this.consoleLogs = [];
    this.networkRequests = [];
  }

  private sendToClient(client: SseClient, msg: SseMessage): boolean {
    try {
      const id = msg.id ?? uuid();
      const payload = `id: ${id}\ndata: ${JSON.stringify({ ...msg, timestamp: Date.now() })}\n\n`;
      client.res.write(payload);
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
        this.sendToClient(client, { type: 'ping', data: { ts: now } });
        this.clients.set(client.id, { ...client, lastPingAt: new Date() });
      }
    }, this.config.pingIntervalMs);
  }

  dispose(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    for (const client of this.clients.values()) {
      try { client.res.end(); } catch {}
    }
    this.clients.clear();
  }
}

export const devtoolsService = new DevtoolsService();
