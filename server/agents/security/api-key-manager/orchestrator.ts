import { generateApiKey } from "./agents/key-generator.agent.js";
import { compareKeyHash } from "./agents/key-hasher.agent.js";
import { rotateApiKey } from "./agents/key-rotation.agent.js";
import { validateApiKey } from "./agents/key-validator.agent.js";
import { checkPermission } from "./agents/permission-checker.agent.js";
import { enforceRateLimit } from "./agents/rate-limiter.agent.js";
import { trackUsage } from "./agents/usage-tracker.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type { AgentResult, ApiKeyManagerState, ApiKeyRequest } from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<ApiKeyManagerState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "BLOCKED",
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function generateApiKeyOrchestrator(
  request: ApiKeyRequest,
  currentState: Readonly<ApiKeyManagerState> = INITIAL_STATE,
): Readonly<AgentResult & { rawKey?: string }> {
  const result = generateApiKey({ request, state: currentState });
  return result;
}

export function validateApiKeyOrchestrator(
  request: ApiKeyRequest,
  currentState: Readonly<ApiKeyManagerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  if (!request.rawKey) return fail(state, "missing_key", "rawKey is required for validation");

  const validationResult = validateApiKey({ rawKey: request.rawKey, state });
  state = validationResult.nextState;
  if (!validationResult.validation?.valid) return validationResult;

  const { validation } = validationResult;
  const keyId = validation.keyId!;

  if (request.requiredPermission) {
    const permResult = checkPermission({
      validation,
      requiredPermission: request.requiredPermission,
      state,
    });
    state = permResult.nextState;
    if (!permResult.output.success) return permResult;
  }

  const rateLimitResult = enforceRateLimit({
    keyId,
    state,
    config: request.rateLimitConfig,
  });
  state = rateLimitResult.nextState;
  if (!rateLimitResult.output.success) return rateLimitResult;

  const usageResult = trackUsage({ keyId, state });
  state = usageResult.nextState;

  const log = buildLog(SOURCE, `Validation complete: keyId=${keyId}`);
  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({
      success: true,
      valid: true,
      keyId,
      usage: usageResult.output.usage,
      logs: Object.freeze([log]),
    }),
  };
}

export function rotateApiKeyOrchestrator(
  request: ApiKeyRequest,
  currentState: Readonly<ApiKeyManagerState> = INITIAL_STATE,
): Readonly<AgentResult & { rawKey?: string }> {
  const { keyId, expiresInDays } = request;

  if (!keyId) {
    return fail(currentState, "missing_key_id", "keyId is required for rotation");
  }

  return rotateApiKey({ keyId, expiresInDays, state: currentState });
}

export function trackUsageOrchestrator(
  request: ApiKeyRequest,
  currentState: Readonly<ApiKeyManagerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  const { keyId } = request;

  if (!keyId) {
    return fail(currentState, "missing_key_id", "keyId is required for usage tracking");
  }

  return trackUsage({ keyId, state: currentState });
}
