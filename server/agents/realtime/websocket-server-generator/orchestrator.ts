import { authMiddlewareAgent } from './agents/auth-middleware.agent.js';
import { connectionManagerAgent } from './agents/connection-manager.agent.js';
import { disconnectHandlerAgent } from './agents/disconnect-handler.agent.js';
import { eventRouterAgent } from './agents/event-router.agent.js';
import { namespaceManagerAgent } from './agents/namespace-manager.agent.js';
import { joinRoom, leaveRoom } from './agents/room-manager.agent.js';
import { serverBootstrapAgent } from './agents/server-bootstrap.agent.js';
import { resetWebSocketGeneratorState, websocketGeneratorState } from './state.js';
import { EventPayload, ServerConfig, SocketConnection, WebSocketGeneratorOutput } from './types.js';
import { logError, logMessage } from './utils/logger.util.js';
import { resolveSocketConfig } from './utils/socket-config.util.js';

export interface WebSocketServerController {
  server: unknown;
  connect: (params: { token?: string; namespace?: string }) => Promise<SocketConnection>;
  routeEvent: (payload: Partial<EventPayload> & { event?: string; connectionId?: string }) => EventPayload;
  joinRoom: (connectionId: string, room: string) => void;
  leaveRoom: (connectionId: string, room: string) => void;
  disconnect: (connectionId: string) => boolean;
  output: () => Readonly<WebSocketGeneratorOutput>;
}

export const startWebSocketServerOrchestrator = async (config: ServerConfig): Promise<WebSocketServerController> => {
  resetWebSocketGeneratorState();
  const resolved = resolveSocketConfig(config);

  // 1. initialize server (server-bootstrap)
  const server = await serverBootstrapAgent(resolved);

  // 2. setup auth middleware
  const auth = (token?: string) => authMiddlewareAgent(resolved, token);

  // 3. setup namespaces
  namespaceManagerAgent(resolved.namespaces);

  // 4. handle connections
  const connect = async (params: { token?: string; namespace?: string }): Promise<SocketConnection> => {
    const authResult = await auth(params.token);
    if (!authResult.authorized) {
      throw new Error(authResult.error ?? 'Unauthorized');
    }

    return connectionManagerAgent({
      userId: authResult.userId,
      metadata: authResult.metadata,
      namespace: params.namespace ?? '/',
      maxConnections: resolved.maxConnections,
    });
  };

  // 5. route events
  const routeEvent = (payload: Partial<EventPayload> & { event?: string; connectionId?: string }): EventPayload => {
    return eventRouterAgent({
      payload,
      spamWindowMs: resolved.spamWindowMs,
      spamMaxEvents: resolved.spamMaxEvents,
    });
  };

  // 6. manage rooms
  const join = (connectionId: string, room: string): void => {
    joinRoom(connectionId, room);
  };

  const leave = (connectionId: string, room: string): void => {
    leaveRoom(connectionId, room);
  };

  // 7. handle disconnect
  const disconnect = (connectionId: string): boolean => disconnectHandlerAgent(connectionId);

  // 8. return server instance
  return {
    server,
    connect,
    routeEvent,
    joinRoom: join,
    leaveRoom: leave,
    disconnect,
    output: () =>
      Object.freeze({
        success: websocketGeneratorState.status === 'RUNNING',
        serverStarted: Boolean(websocketGeneratorState.server),
        activeConnections: websocketGeneratorState.activeConnections.length,
        logs: [...websocketGeneratorState.logs],
        error: websocketGeneratorState.errors.at(-1),
      }),
  };
};

export const stopWebSocketServerOrchestrator = async (config?: ServerConfig): Promise<Readonly<WebSocketGeneratorOutput>> => {
  try {
    if (config?.closeServer && websocketGeneratorState.server) {
      await config.closeServer(websocketGeneratorState.server);
    }
    logMessage('WebSocket server stopped');
    websocketGeneratorState.server = null;
    websocketGeneratorState.status = 'INIT';
  } catch (error) {
    websocketGeneratorState.status = 'ERROR';
    logError(error instanceof Error ? error.message : String(error));
  }

  return Object.freeze({
    success: websocketGeneratorState.status !== 'ERROR',
    serverStarted: Boolean(websocketGeneratorState.server),
    activeConnections: websocketGeneratorState.activeConnections.length,
    logs: [...websocketGeneratorState.logs],
    error: websocketGeneratorState.errors.at(-1),
  });
};
