import { consumeAuthCode, generateAuthCode } from "./agents/auth-code-flow.agent.js";
import { validateClient } from "./agents/client-registry.agent.js";
import { handleConsent } from "./agents/consent-handler.agent.js";
import { verifyPkce, validatePkceParams } from "./agents/pkce-verifier.agent.js";
import { rotateRefreshToken, storeRefreshToken } from "./agents/refresh-token.agent.js";
import { revokeToken } from "./agents/revocation.agent.js";
import { validateScopes } from "./agents/scope-validator.agent.js";
import { issueAccessToken } from "./agents/token-issuer.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type { AgentResult, OAuthProviderState, OAuthRequest, OAuthResponse } from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<OAuthProviderState>,
  error: string,
  log: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "ERROR",
      appendError: buildError(SOURCE, log),
      appendLog: buildLog(SOURCE, log),
    }),
    output: Object.freeze({
      success: false,
      error,
      logs: Object.freeze([buildLog(SOURCE, log)]),
    }),
  };
}

export function authorizeOrchestrator(
  request: OAuthRequest,
  currentState: Readonly<OAuthProviderState> = INITIAL_STATE,
): Readonly<AgentResult & { authCode?: string }> {
  let state = currentState;

  const clientResult = validateClient({ request, state });
  state = clientResult.nextState;
  if (!clientResult.output.success) return clientResult;

  const client = state.clients.find((c) => c.clientId === request.clientId)!;

  const pkceCheck = validatePkceParams(request);
  if (!pkceCheck.valid) {
    return fail(state, "invalid_request", pkceCheck.error ?? "PKCE validation failed");
  }

  const requestedScopes = request.scopes ?? [];
  const scopeResult = validateScopes({ requestedScopes, client, state });
  state = scopeResult.nextState;
  if (!scopeResult.output.success) return scopeResult;

  const userId = request.userId;
  if (!userId) {
    return fail(state, "invalid_request", "Missing user_id");
  }

  const consentResult = handleConsent({ request, state, userId, scopes: requestedScopes });
  state = consentResult.nextState;
  if (!consentResult.output.success) return consentResult;

  const authCodeResult = generateAuthCode({ request, client, userId, scopes: requestedScopes, state });
  state = authCodeResult.nextState;
  if (!authCodeResult.output.success) return authCodeResult;

  const issuedCode = state.authCodes[state.authCodes.length - 1]!.code;
  const log = buildLog(SOURCE, `Authorization complete. Code issued for client=${request.clientId}`);

  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({
      success: true,
      logs: Object.freeze([log]),
    }),
    authCode: issuedCode,
  };
}

export function issueTokenOrchestrator(
  request: OAuthRequest,
  currentState: Readonly<OAuthProviderState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  if (!request.code) return fail(state, "invalid_request", "Missing authorization code");
  if (!request.redirectUri) return fail(state, "invalid_request", "Missing redirect_uri");

  const clientResult = validateClient({ request, state });
  state = clientResult.nextState;
  if (!clientResult.output.success) return clientResult;

  const { authCode, nextState, log } = consumeAuthCode(
    request.code,
    request.clientId,
    request.redirectUri,
    state,
  );
  state = nextState;
  if (!authCode) {
    return fail(state, "invalid_grant", log);
  }

  const pkceResult = verifyPkce({ request, state, codeChallenge: authCode.codeChallenge });
  state = pkceResult.nextState;
  if (!pkceResult.output.success) return pkceResult;

  const tokenResult = issueAccessToken({ authCode, state });
  state = tokenResult.nextState;
  if (!tokenResult.output.success || !tokenResult.tokens) {
    return fail(state, "server_error", "Token issuance failed");
  }

  const { accessToken, refreshTokenRaw, expiresIn } = tokenResult.tokens;

  state = storeRefreshToken({
    refreshTokenRaw,
    clientId: authCode.clientId,
    userId: authCode.userId,
    scopes: authCode.scopes,
    state,
  });

  const response: OAuthResponse = Object.freeze({
    success: true,
    accessToken,
    refreshToken: refreshTokenRaw,
    expiresIn,
    scope: authCode.scopes.join(" "),
    logs: Object.freeze([buildLog(SOURCE, `Tokens issued for user=${authCode.userId}`)]),
  });

  return { nextState: state, output: response };
}

export function refreshTokenOrchestrator(
  request: OAuthRequest,
  currentState: Readonly<OAuthProviderState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  if (!request.refreshToken) return fail(state, "invalid_request", "Missing refresh_token");

  const clientResult = validateClient({ request, state });
  state = clientResult.nextState;
  if (!clientResult.output.success) return clientResult;

  const refreshResult = rotateRefreshToken({
    rawRefreshToken: request.refreshToken,
    clientId: request.clientId,
    state,
  });
  state = refreshResult.nextState;
  if (!refreshResult.output.success || !refreshResult.tokens) return refreshResult;

  const { accessToken, refreshToken, expiresIn } = refreshResult.tokens;

  const response: OAuthResponse = Object.freeze({
    success: true,
    accessToken,
    refreshToken,
    expiresIn,
    logs: Object.freeze([buildLog(SOURCE, `Tokens refreshed for client=${request.clientId}`)]),
  });

  return { nextState: state, output: response };
}

export function revokeTokenOrchestrator(
  request: OAuthRequest,
  currentState: Readonly<OAuthProviderState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  if (!request.tokenToRevoke) return fail(state, "invalid_request", "Missing token to revoke");

  const clientResult = validateClient({ request, state });
  state = clientResult.nextState;
  if (!clientResult.output.success) return clientResult;

  return revokeToken({ tokenToRevoke: request.tokenToRevoke, clientId: request.clientId, state });
}
