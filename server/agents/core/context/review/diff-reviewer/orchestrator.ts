import { parseDiff } from "./agents/diff-parser.agent.js";
import { classifyChanges } from "./agents/change-classifier.agent.js";
import { analyzeRisks } from "./agents/risk-analyzer.agent.js";
import { detectBreakingChanges } from "./agents/breaking-change-detector.agent.js";
import { analyzeDependencyImpact } from "./agents/dependency-impact.agent.js";
import { makeReviewDecision } from "./agents/review-decision.agent.js";
import {
  appendError,
  appendLog,
  createInitialState,
  withChanges,
  withDecision,
  withFilesChanged,
  withRisks,
} from "./state.js";
import type { DiffInput, ReviewResult } from "./types.js";
import { createErrorLog, createLog } from "./utils/logger.util.js";

export function reviewDiff(input: DiffInput): ReviewResult {
  let state = createInitialState(input.diffId);

  try {
    state = appendLog(state, createLog("orchestrator", "Received diff input."));

    const parsed = parseDiff(input);
    state = withFilesChanged(state, parsed.map((change) => change.filePath));
    state = appendLog(state, createLog("orchestrator", "Parsed diff into file-level changes."));

    const classified = classifyChanges(parsed);
    state = withChanges(state, classified);
    state = appendLog(state, createLog("orchestrator", "Classified all changes."));

    const risks = analyzeRisks(classified);
    state = withRisks(state, risks);
    state = appendLog(state, createLog("orchestrator", "Completed risk analysis."));

    const breakingChanges = detectBreakingChanges(classified);
    state = appendLog(state, createLog("orchestrator", "Completed breaking-change analysis."));

    const impactedFiles = analyzeDependencyImpact(classified);
    state = appendLog(state, createLog("orchestrator", "Completed dependency-impact analysis."));

    const decision = makeReviewDecision(risks, breakingChanges);
    state = withDecision(state, decision);
    state = appendLog(state, createLog("orchestrator", "Generated final review decision."));

    const output: ReviewResult = {
      success: true,
      decision: state.decision,
      risks,
      breakingChanges,
      impactedFiles,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown diff-review failure.";
    state = appendError(state, createErrorLog("orchestrator", message));

    const failed: ReviewResult = {
      success: false,
      decision: "REJECT",
      risks: state.risks,
      breakingChanges: Object.freeze([]),
      impactedFiles: Object.freeze([]),
      logs: state.logs,
      error: message,
    };

    return Object.freeze(failed);
  }
}
