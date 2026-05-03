import { sanitizeHtml } from "./agents/html-sanitizer.agent.js";
import { normalizePayload } from "./agents/payload-normalizer.agent.js";
import { sanitizeScripts } from "./agents/script-sanitizer.agent.js";
import { sanitizeSql } from "./agents/sql-sanitizer.agent.js";
import { sanitizeUrls } from "./agents/url-sanitizer.agent.js";
import { validatePayload } from "./agents/validation-agent.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  InputPayload,
  SanitizedPayload,
  SanitizerOptions,
  SanitizerState,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<SanitizerState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "FAILED",
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      sanitized: Object.freeze({}),
      issues: state.issues,
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function sanitizeInputOrchestrator(
  payload: InputPayload,
  options: SanitizerOptions = {},
  currentState: Readonly<SanitizerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  let state = currentState;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fail(state, "invalid_payload", "Input payload must be a non-null object");
  }

  const normResult = normalizePayload({ payload, options, state });
  state = normResult.nextState;
  let current: SanitizedPayload = normResult.normalized ?? payload;

  const htmlResult = sanitizeHtml({ payload: current, options, state });
  state = htmlResult.nextState;
  current = htmlResult.sanitized ?? current;

  const scriptResult = sanitizeScripts({ payload: current, state });
  state = scriptResult.nextState;
  current = scriptResult.sanitized ?? current;

  const sqlResult = sanitizeSql({ payload: current, state });
  state = sqlResult.nextState;
  current = sqlResult.sanitized ?? current;

  const urlResult = sanitizeUrls({ payload: current, options, state });
  state = urlResult.nextState;
  current = urlResult.sanitized ?? current;

  const validationResult = validatePayload({ payload: current, state });
  state = validationResult.nextState;

  const blockedCount = state.issues.filter((i) => i.level === "BLOCKED").length;
  const log = buildLog(
    SOURCE,
    `Sanitization complete: ${state.issues.length} issues (${blockedCount} blocked), valid=${validationResult.valid}`,
  );

  return {
    nextState: transitionState(state, {
      sanitizedOutput: current,
      appendLog: log,
    }),
    output: Object.freeze({
      success: validationResult.output.success,
      sanitized: current,
      issues: state.issues,
      logs: Object.freeze([log]),
      ...(validationResult.output.error ? { error: validationResult.output.error } : {}),
    }),
  };
}

export function validateInputOrchestrator(
  payload: InputPayload,
  currentState: Readonly<SanitizerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  return validatePayload({ payload, state: currentState });
}

export function getSanitizationReportOrchestrator(
  currentState: Readonly<SanitizerState>,
): Readonly<AgentResult> {
  const { issues, logs, errors } = currentState;
  const blocked = issues.filter((i) => i.level === "BLOCKED").length;
  const warnings = issues.filter((i) => i.level === "WARNING").length;
  const log = buildLog(
    SOURCE,
    `Report: total=${issues.length} blocked=${blocked} warnings=${warnings} errors=${errors.length}`,
  );

  return {
    nextState: transitionState(currentState, { appendLog: log }),
    output: Object.freeze({
      success: true,
      sanitized: currentState.sanitizedOutput,
      issues,
      logs: Object.freeze([...logs, log]),
    }),
  };
}
