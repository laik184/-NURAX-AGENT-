import { buildApiKeyLimitKey } from "./agents/api-key-limiter.agent.js";
import { checkIpBlock, buildIpLimitKey, blockEntry } from "./agents/ip-limiter.agent.js";
import { selectStrategy } from "./agents/limiter-strategy-selector.agent.js";
import { registerLimiter, resolveConfig } from "./agents/rate-limiter-generator.agent.js";
import { applySlidingWindow } from "./agents/sliding-window.agent.js";
import { applyTokenBucket } from "./agents/token-bucket.agent.js";
import { buildUserLimitKey } from "./agents/user-limiter.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type { AgentResult, RateLimitConfig, RateLimiterState, RequestContext } from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<RateLimiterState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      allowed: false,
      remaining: 0,
      resetTime: 0,
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

function applyStrategy(
  key: string,
  config: Readonly<RateLimitConfig>,
  state: Readonly<RateLimiterState>,
): Readonly<AgentResult> {
  const { strategy } = selectStrategy(config);
  if (strategy === "TOKEN_BUCKET") {
    return applyTokenBucket({ key, config, state });
  }
  return applySlidingWindow({ key, config, state });
}

export function createRateLimiterOrchestrator(
  config: Readonly<RateLimitConfig>,
  currentState: Readonly<RateLimiterState> = INITIAL_STATE,
): Readonly<AgentResult> {
  return registerLimiter({ config, state: currentState });
}

export function checkLimitOrchestrator(
  context: Readonly<RequestContext>,
  currentState: Readonly<RateLimiterState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  const ipKey = buildIpLimitKey(context);
  if (ipKey) {
    const ipBlockResult = checkIpBlock({
      context,
      config: {} as RateLimitConfig,
      state,
    });
    if (ipBlockResult) return ipBlockResult;
  }

  const targets: Array<{ key: string | null; target: string }> = [
    { key: buildIpLimitKey(context), target: "IP" },
    { key: buildUserLimitKey(context), target: "USER" },
    { key: buildApiKeyLimitKey(context), target: "API_KEY" },
  ];

  for (const { key, target } of targets) {
    if (!key) continue;

    const config = resolveConfig(context, state, target);
    if (!config) continue;

    const result = applyStrategy(key, config, state);
    state = result.nextState;

    if (!result.output.allowed) {
      if (config.blockDurationMs && key.startsWith("ip:")) {
        state = blockEntry(key, config.blockDurationMs, "rate_limit_exceeded", state);
      }
      return { nextState: state, output: result.output };
    }
  }

  const log = buildLog(SOURCE, `Request allowed: ip=${context.ip ?? "-"} user=${context.userId ?? "-"} route=${context.route ?? "-"}`);
  const lastResult = Object.values(state.requestCounts).at(-1);
  const remaining = "count" in (lastResult ?? {})
    ? Math.max(0, 100 - ((lastResult as { count: number }).count ?? 0))
    : 100;

  return {
    nextState: transitionState(state, { status: "ACTIVE", appendLog: log }),
    output: Object.freeze({
      success: true,
      allowed: true,
      remaining,
      resetTime: Date.now() + 60_000,
      logs: Object.freeze([log]),
    }),
  };
}

export function resetLimitsOrchestrator(
  key?: string,
  currentState: Readonly<RateLimiterState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let updatedCounts = { ...currentState.requestCounts };
  let updatedBlocked = [...currentState.blockedRequests];

  if (key) {
    delete updatedCounts[key];
    updatedBlocked = updatedBlocked.filter((b) => b.key !== key);
  } else {
    updatedCounts = {};
    updatedBlocked = [];
  }

  const log = buildLog(SOURCE, key ? `Limits reset for key=${key}` : "All limits reset");
  return {
    nextState: transitionState(currentState, {
      status: "IDLE",
      requestCounts: updatedCounts,
      blockedRequests: updatedBlocked,
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      allowed: true,
      remaining: 0,
      resetTime: 0,
      logs: Object.freeze([log]),
    }),
  };
}
