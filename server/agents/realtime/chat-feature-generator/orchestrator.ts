import { generateChatUiModule } from './agents/chat-ui.agent.js';
import { generateChatSchemaModule } from './agents/chat-schema.agent.js';
import { generateEventDispatcherModule } from './agents/event-dispatcher.agent.js';
import { generateMessageHandlerModule } from './agents/message-handler.agent.js';
import { generatePresenceManagerModule } from './agents/presence-manager.agent.js';
import { generateReadReceiptModule } from './agents/read-receipt.agent.js';
import { generateRoomManagerModule } from './agents/room-manager.agent.js';
import { generateSocketClientModule } from './agents/socket-client.agent.js';
import { generateSocketServerModule } from './agents/socket-server.agent.js';
import { generateTypingIndicatorModule } from './agents/typing-indicator.agent.js';
import { initialChatFeatureState } from './state.js';
import type { ChatFeatureContext, ChatFeatureOutput, ChatGeneratorState, GeneratedModule } from './types.js';
import { mapEventName, toEventPayload } from './utils/event-mapper.util.js';
import { appendLog, createLog } from './utils/logger.util.js';

function toOutput(
  success: boolean,
  modulesGenerated: readonly GeneratedModule[],
  logs: readonly string[],
  error?: string,
): ChatFeatureOutput {
  return Object.freeze({
    success,
    modulesGenerated,
    realtimeEnabled: true,
    logs,
    ...(error ? { error } : {}),
  });
}

export async function generateChatFeature(
  previousState: ChatGeneratorState = initialChatFeatureState,
  options: Readonly<{ enableRedisAdapter?: boolean }> = {},
): Promise<Readonly<{ state: ChatGeneratorState; output: ChatFeatureOutput }>> {
  const context: ChatFeatureContext = Object.freeze({
    nowIso: new Date().toISOString(),
    enableRedisAdapter: Boolean(options.enableRedisAdapter),
  });

  let logs = appendLog(previousState.logs, createLog('orchestrator', 'starting chat feature generation'));

  try {
    const schema = generateChatSchemaModule(context);
    logs = appendLog(logs, createLog('orchestrator', 'step 1/6 schema generated'));

    const socketServer = generateSocketServerModule(context);
    logs = appendLog(logs, createLog('orchestrator', 'step 2/6 socket server generated'));

    const eventSystem = generateEventDispatcherModule(context);
    logs = appendLog(logs, createLog('orchestrator', 'step 3/6 event system generated'));

    const socketClient = generateSocketClientModule(context);
    logs = appendLog(logs, createLog('orchestrator', 'step 4/6 socket client generated'));

    const chatUi = generateChatUiModule(context);
    logs = appendLog(logs, createLog('orchestrator', 'step 5/6 chat ui generated'));

    const messageHandler = generateMessageHandlerModule(context);
    const roomManager = generateRoomManagerModule(context);
    const presenceManager = generatePresenceManagerModule(context);
    const readReceipt = generateReadReceiptModule(context);
    const typingIndicator = generateTypingIndicatorModule(context);
    logs = appendLog(logs, createLog('orchestrator', 'step 6/6 feature modules generated'));

    const connectEvent = Object.freeze({
      event: 'connected',
      payload: { source: 'orchestrator' },
      timestamp: context.nowIso,
    });

    logs = appendLog(
      logs,
      createLog('events', `${mapEventName(connectEvent)} payload=${JSON.stringify(toEventPayload(connectEvent))}`),
    );

    const modulesGenerated = Object.freeze([
      schema,
      socketServer,
      eventSystem,
      socketClient,
      chatUi,
      messageHandler,
      roomManager,
      presenceManager,
      readReceipt,
      typingIndicator,
    ] as const);

    const nextState: ChatGeneratorState = Object.freeze({
      ...previousState,
      status: 'ACTIVE',
      logs,
    });

    return Object.freeze({
      state: nextState,
      output: toOutput(true, modulesGenerated, logs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown chat generation error';
    logs = appendLog(logs, createLog('error', message));

    const nextState: ChatGeneratorState = Object.freeze({
      ...previousState,
      status: 'RUNNING',
      logs,
      errors: Object.freeze([...previousState.errors, message]),
    });

    return Object.freeze({
      state: nextState,
      output: toOutput(false, Object.freeze([]), logs, message),
    });
  }
}

export async function setupRealtime(
  previousState: ChatGeneratorState = initialChatFeatureState,
): Promise<Readonly<{ state: ChatGeneratorState; output: ChatFeatureOutput }>> {
  return generateChatFeature(previousState, { enableRedisAdapter: true });
}

export async function connectClient(
  previousState: ChatGeneratorState = initialChatFeatureState,
): Promise<Readonly<{ state: ChatGeneratorState; output: ChatFeatureOutput }>> {
  return generateChatFeature(previousState, { enableRedisAdapter: false });
}
