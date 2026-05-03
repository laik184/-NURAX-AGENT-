import { transitionState } from "../state.js";
import type { PubSubMessage, RedisAgentState, RedisResponse } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { deserializeMessage, serializeMessage } from "../utils/serializer.util.js";
import { getAdapter } from "../utils/redis-client.util.js";

const SOURCE = "pubsub-manager";

export interface PubSubResult<T = unknown> {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<T>>;
}

export async function publishMessage(
  channel: string,
  payload: unknown,
  state: Readonly<RedisAgentState>,
): Promise<PubSubResult<{ channel: string; receiverCount: number }>> {
  const message: PubSubMessage = Object.freeze({
    channel,
    payload,
    timestamp: Date.now(),
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  });

  try {
    const serialized = serializeMessage(message);
    const receiverCount = await getAdapter().publish(channel, serialized);
    const log = buildLog(SOURCE, `PubSub PUBLISH channel="${channel}" receivers=${receiverCount} msgId=${message.messageId}`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({
        success: true,
        data: Object.freeze({ channel, receiverCount }),
        logs: Object.freeze([log]),
        operation: "pubsub:publish" as const,
      }),
    };
  } catch (err) {
    const msg = `PubSub PUBLISH failed on channel="${channel}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "publish_failed", operation: "pubsub:publish" as const }),
    };
  }
}

export async function subscribeToChannel(
  channel: string,
  onMessage: (message: PubSubMessage) => void,
  state: Readonly<RedisAgentState>,
): Promise<PubSubResult<{ channel: string }>> {
  try {
    await getAdapter().subscribe(channel, (raw) => {
      try {
        const { payload, ts } = deserializeMessage(raw);
        onMessage(Object.freeze({ channel, payload, timestamp: ts }));
      } catch {
        onMessage(Object.freeze({ channel, payload: raw, timestamp: Date.now() }));
      }
    });

    const log = buildLog(SOURCE, `PubSub SUBSCRIBE channel="${channel}"`);
    return {
      nextState: transitionState(state, { addChannel: channel, appendLog: log }),
      output: Object.freeze({
        success: true,
        data: Object.freeze({ channel }),
        logs: Object.freeze([log]),
        operation: "pubsub:subscribe" as const,
      }),
    };
  } catch (err) {
    const msg = `PubSub SUBSCRIBE failed on channel="${channel}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "subscribe_failed", operation: "pubsub:subscribe" as const }),
    };
  }
}

export async function unsubscribeFromChannel(
  channel: string,
  state: Readonly<RedisAgentState>,
): Promise<PubSubResult> {
  try {
    await getAdapter().unsubscribe(channel);
    const log = buildLog(SOURCE, `PubSub UNSUBSCRIBE channel="${channel}"`);
    return {
      nextState: transitionState(state, { removeChannel: channel, appendLog: log }),
      output: Object.freeze({ success: true, logs: Object.freeze([log]), operation: "pubsub:unsubscribe" as const }),
    };
  } catch (err) {
    const msg = `PubSub UNSUBSCRIBE failed on channel="${channel}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "unsubscribe_failed", operation: "pubsub:unsubscribe" as const }),
    };
  }
}
