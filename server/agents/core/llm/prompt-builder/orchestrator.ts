import {
  appendError,
  appendLog,
  getPromptBuilderState,
  resetPromptBuilderState,
  setContext,
  setFinalPrompt,
  setStatus,
  setSystemPrompt,
  setTokenCount,
  setUserPrompt,
} from "./state.js";
import type { PromptInput, PromptOutput } from "./types.js";
import { buildSystemPrompt } from "./agents/system-prompt.agent.js";
import { buildUserPrompt } from "./agents/user-prompt.agent.js";
import { buildContext } from "./agents/context-builder.agent.js";
import { enforceInstructions } from "./agents/instruction-enforcer.agent.js";
import { optimizeTokenBudget } from "./agents/token-optimizer.agent.js";
import { formatPrompt } from "./agents/prompt-formatter.agent.js";
import { estimateTokens } from "./utils/token-estimator.util.js";
import { logStep } from "./utils/logger.util.js";

const DEFAULT_TOKEN_LIMIT = 4000;

export function buildPrompt(input: PromptInput): PromptOutput {
  resetPromptBuilderState();
  setStatus("BUILDING");

  try {
    let logs: readonly string[] = Object.freeze([]);

    logs = logStep(logs, "load system prompt");
    const systemPrompt = buildSystemPrompt(input.systemPrompt);
    setSystemPrompt(systemPrompt);

    logs = logStep(logs, "process user input");
    const userPrompt = buildUserPrompt(input.userInput);
    setUserPrompt(userPrompt);

    logs = logStep(logs, "attach context");
    const mergedContext = buildContext(input.history, input.context);
    setContext(mergedContext);

    logs = logStep(logs, "enforce instructions");
    const enforced = enforceInstructions(systemPrompt, userPrompt);

    logs = logStep(logs, "optimize tokens");
    const optimized = optimizeTokenBudget(
      enforced.systemPrompt,
      enforced.userPrompt,
      mergedContext,
      input.tokenLimit ?? DEFAULT_TOKEN_LIMIT,
    );

    logs = logStep(logs, "format final prompt");
    const finalPrompt = formatPrompt(
      enforced.systemPrompt,
      enforced.userPrompt,
      optimized.context,
    );

    const tokenCount = estimateTokens(finalPrompt);
    setFinalPrompt(finalPrompt);
    setTokenCount(tokenCount);

    for (const message of logs) appendLog(message);
    setStatus("COMPLETE");

    return Object.freeze({
      success: true,
      prompt: finalPrompt,
      tokens: tokenCount,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown prompt build error";
    appendError(message);
    setStatus("FAILED");

    const current = getPromptBuilderState();
    return Object.freeze({
      success: false,
      prompt: current.finalPrompt,
      tokens: current.tokenCount,
      logs: current.logs,
      error: message,
    });
  }
}

export function optimizePrompt(input: PromptInput): PromptOutput {
  return buildPrompt(input);
}

export function validatePrompt(input: PromptInput): PromptOutput {
  if (!input.userInput || input.userInput.trim().length === 0) {
    return Object.freeze({
      success: false,
      prompt: "",
      tokens: 0,
      logs: Object.freeze(["[prompt-builder] validation failed: missing user input"]),
      error: "User input is required.",
    });
  }

  return Object.freeze({
    success: true,
    prompt: "",
    tokens: 0,
    logs: Object.freeze(["[prompt-builder] validation passed"]),
  });
}
