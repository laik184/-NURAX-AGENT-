import { generateUserBackupCodes, verifyBackupCode } from "./agents/backup-code.agent.js";
import { disableMFA, enableMFA, enrollUser } from "./agents/mfa-enrollment.agent.js";
import { failMFAResult, incrementAttempts, resetAttempts, validateMFARequest } from "./agents/mfa-validator.agent.js";
import { sendOTP } from "./agents/otp-sender.agent.js";
import { verifyOTP } from "./agents/otp-verifier.agent.js";
import { generateTOTP } from "./agents/totp-generator.agent.js";
import { verifyTOTP } from "./agents/totp-verifier.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type { AgentResult, MFARequest, MFAState } from "./types.js";
import { buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

export function enrollMFAOrchestrator(
  request: MFARequest,
  currentState: Readonly<MFAState> = INITIAL_STATE,
): Readonly<AgentResult & { qrCodeUri?: string; backupCodes?: readonly string[] }> {
  let state = currentState;

  if (request.method === "TOTP") {
    const totpResult = generateTOTP({ request, state });
    state = totpResult.nextState;
    if (!totpResult.output.success || !totpResult.totpSecret) return totpResult;

    const { totpSecret } = totpResult;

    const enrollResult = enrollUser({
      userId: request.userId,
      method: "TOTP",
      totpSecret: totpSecret.secret,
      state,
    });
    state = enrollResult.nextState;
    if (!enrollResult.output.success) return enrollResult;

    const backupResult = generateUserBackupCodes({ userId: request.userId, state });
    state = backupResult.nextState;

    const log = buildLog(SOURCE, `TOTP enrollment complete for user=${request.userId}`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({
        success: true,
        method: "TOTP",
        verified: false,
        qrCodeUri: totpSecret.qrCodeUri,
        backupCodes: backupResult.rawCodes,
        logs: Object.freeze([log]),
      }),
      qrCodeUri: totpSecret.qrCodeUri,
      backupCodes: backupResult.rawCodes,
    };
  }

  if (request.method === "OTP") {
    const enrollResult = enrollUser({ userId: request.userId, method: "OTP", state });
    state = enrollResult.nextState;
    if (!enrollResult.output.success) return enrollResult;

    const otpResult = sendOTP({ request, state });
    state = otpResult.nextState;
    if (!otpResult.output.success) return otpResult;

    const backupResult = generateUserBackupCodes({ userId: request.userId, state });
    state = backupResult.nextState;

    const log = buildLog(SOURCE, `OTP enrollment initiated for user=${request.userId}`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({
        success: true,
        method: "OTP",
        verified: false,
        backupCodes: backupResult.rawCodes,
        logs: Object.freeze([log]),
      }),
      backupCodes: backupResult.rawCodes,
    };
  }

  return failMFAResult("TOTP", "unsupported_method", `Unsupported MFA method: ${request.method}`, state);
}

export function enableMFAOrchestrator(
  request: MFARequest,
  currentState: Readonly<MFAState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  if (!request.code) {
    return failMFAResult(request.method, "missing_code", "Verification code required to enable MFA", state);
  }

  const verifyResult = verifyMFAOrchestrator(request, state);
  state = verifyResult.nextState;
  if (!verifyResult.output.verified) return verifyResult;

  return enableMFA(request.userId, state);
}

export function verifyMFAOrchestrator(
  request: MFARequest,
  currentState: Readonly<MFAState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  const { valid, error, nextState } = validateMFARequest({
    userId: request.userId,
    method: request.method,
    state,
  });
  state = nextState;

  if (!valid) {
    return failMFAResult(request.method, error ?? "validation_failed", error ?? "MFA validation failed", state);
  }

  state = incrementAttempts(request.userId, state);

  if (!request.code) {
    return failMFAResult(request.method, "missing_code", "Verification code is required", state);
  }

  if (request.method === "TOTP") {
    const user = state.users.find((u) => u.userId === request.userId);
    if (!user?.totpSecretHash) {
      return failMFAResult("TOTP", "no_totp_secret", "No TOTP secret on file for user", state);
    }

    const pending = state.pendingTOTP.find((t) => t.userId === request.userId);
    const secretToUse = pending?.secret ?? "";

    if (!secretToUse) {
      return failMFAResult("TOTP", "totp_secret_unavailable", "TOTP secret not available for verification", state);
    }

    const result = verifyTOTP({ userId: request.userId, code: request.code, secret: secretToUse, state });
    state = result.nextState;
    if (result.output.verified) state = resetAttempts(request.userId, state);
    return { ...result, nextState: state };
  }

  if (request.method === "OTP") {
    const result = verifyOTP({ userId: request.userId, code: request.code, state });
    state = result.nextState;
    if (result.output.verified) state = resetAttempts(request.userId, state);
    return { ...result, nextState: state };
  }

  if (request.method === "BACKUP") {
    const result = verifyBackupCode({ userId: request.userId, code: request.code, state });
    state = result.nextState;
    if (result.output.verified) state = resetAttempts(request.userId, state);
    return { ...result, nextState: state };
  }

  return failMFAResult(request.method, "unsupported_method", `Unknown method: ${request.method}`, state);
}

export function disableMFAOrchestrator(
  request: MFARequest,
  currentState: Readonly<MFAState> = INITIAL_STATE,
): Readonly<AgentResult> {
  return disableMFA({ userId: request.userId, state: currentState });
}
