import { buildFormat } from "./agents/format-builder.agent.js";
import { logError } from "./agents/error-logger.agent.js";
import { buildLoggerConfig } from "./agents/logger-config.agent.js";
import { resolveLogLevel } from "./agents/log-level-manager.agent.js";
import { logRequest } from "./agents/request-logger.agent.js";
import { buildTransports } from "./agents/transport-builder.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  LogEntry,
  LoggerInstance,
  LoggerOutput,
  LoggerState,
  TransportConfig,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";
import { buildLoggerInstance } from "./logger-instance-builder.js";
import { dispatchEntry } from "./transport-writer.js";

export type { RequestInput } from "./agents/request-logger.agent.js";
export type { ErrorInput } from "./agents/error-logger.agent.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<LoggerState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  const noopLogger: Readonly<LoggerInstance> = Object.freeze({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  });

  const nextState = transitionState(state, {
    appendError: buildError(SOURCE, message),
    appendLog: buildLog(SOURCE, message),
  });

  return {
    nextState,
    output: Object.freeze<LoggerOutput>({
      success: false,
      logger: noopLogger,
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function initLoggerOrchestrator(
  currentState: Readonly<LoggerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  try {
    const levelResult = resolveLogLevel(state);
    state = levelResult.nextState;

    const transportResult = buildTransports(state);
    state = transportResult.nextState;

    const configResult = buildLoggerConfig(
      state,
      levelResult.logLevel,
      transportResult.transports,
    );
    state = configResult.nextState;
    const config = configResult.config;

    const formatResult = buildFormat(state, config);
    state = formatResult.nextState;

    state = transitionState(state, { appendLog: buildLog(SOURCE, "Request logger attached") });
    state = transitionState(state, { appendLog: buildLog(SOURCE, "Error logger attached") });

    const loggerInstance = buildLoggerInstance({
      level: config.level,
      service: config.service,
      environment: config.environment,
      transports: config.transports,
      serialize: formatResult.serialize,
    });

    const finalLog = buildLog(
      SOURCE,
      `Logger initialized: level=${config.level} format=${config.format} transports=${config.transports.length} service=${config.service}`,
    );
    state = transitionState(state, { initialized: true, appendLog: finalLog });

    const output: Readonly<LoggerOutput> = Object.freeze({
      success: true,
      logger: loggerInstance,
      logs: state.logs,
    });

    return Object.freeze({ nextState: state, output });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown initialization error";
    return fail(state, message, `Logger initialization failed: ${message}`);
  }
}

export function logRequestOrchestrator(
  input: Parameters<typeof logRequest>[1],
  serialize: (entry: Readonly<LogEntry>) => string,
  transports: readonly Readonly<TransportConfig>[],
  state: Readonly<LoggerState>,
  service?: string,
  environment?: string,
): Readonly<{ nextState: Readonly<LoggerState>; entry: Readonly<LogEntry> }> {
  const result = logRequest(state, input, service, environment);
  dispatchEntry(result.entry, serialize, transports);
  return result;
}

export function logErrorOrchestrator(
  input: Parameters<typeof logError>[1],
  serialize: (entry: Readonly<LogEntry>) => string,
  transports: readonly Readonly<TransportConfig>[],
  state: Readonly<LoggerState>,
  service?: string,
  environment?: string,
): Readonly<{ nextState: Readonly<LoggerState>; entry: Readonly<LogEntry> }> {
  const result = logError(state, input, service, environment);
  dispatchEntry(result.entry, serialize, transports);
  return result;
}
