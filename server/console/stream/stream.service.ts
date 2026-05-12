/**
 * IQ 2000 — Console · Stream Service
 *
 * Manages Server-Sent Events (SSE) connections from browser clients.
 * Each client subscribes to a specific projectId; the orchestrator
 * calls broadcast() for every captured ConsoleLine.
 */

import { randomUUID } from 'crypto';
import type { Response } from 'express';
import type { ConsoleLine, SseClient, StreamSnapshot } from '../types.ts';

class StreamService {
  private clients = new Map<string, SseClient>();

  // ─── Client lifecycle ──────────────────────────────────────────────────

  /**
   * Register an Express Response as an SSE channel.
   * Returns the client ID so the caller can clean up on disconnect.
   */
  addClient(projectId: number, res: Response): string {
    const id = randomUUID();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const client: SseClient = { id, projectId, res, connectedAt: new Date() };
    this.clients.set(id, client);

    this.sendToClient(client, { type: 'connected', clientId: id, projectId });

    return id;
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  // ─── Broadcasting ──────────────────────────────────────────────────────

  /**
   * Push a ConsoleLine to all SSE clients watching the same projectId.
   */
  broadcast(line: ConsoleLine): void {
    for (const client of this.clients.values()) {
      if (client.projectId === line.projectId) {
        this.sendToClient(client, {
          type: 'console',
          id: line.id,
          kind: line.kind,
          stream: line.kind === 'stderr' || line.kind === 'error' ? 'stderr' : 'stdout',
          line: line.text,
          ts: line.ts.toISOString(),
        });
      }
    }
  }

  /**
   * Send a raw system notification to all clients of a project
   * (e.g. "agent started", "build complete").
   */
  notify(projectId: number, message: string): void {
    const line: ConsoleLine = {
      id: `notify-${Date.now()}`,
      projectId,
      kind: 'system',
      text: message,
      ts: new Date(),
    };
    this.broadcast(line);
  }

  getSnapshot(): StreamSnapshot {
    return {
      clientCount: this.clients.size,
      clients: [...this.clients.values()].map(({ id, projectId, connectedAt }) => ({
        id, projectId, connectedAt,
      })),
    };
  }

  dispose(): void {
    for (const client of this.clients.values()) {
      try { client.res.end(); } catch {}
    }
    this.clients.clear();
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private sendToClient(client: SseClient, data: Record<string, unknown>): void {
    try {
      const event = data.type as string;
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.clients.delete(client.id);
    }
  }
}

export const streamService = new StreamService();
