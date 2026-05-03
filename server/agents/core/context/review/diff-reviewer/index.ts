import { reviewDiff } from "./orchestrator.js";
import type { DiffInput, ReviewResult } from "./types.js";

export function getRiskReport(input: DiffInput): ReviewResult["risks"] {
  return reviewDiff(input).risks;
}

export function validateChange(input: DiffInput): boolean {
  const result = reviewDiff(input);
  return result.decision !== "REJECT";
}

export { reviewDiff };

export type {
  DiffInput,
  FileChange,
  ChangeType,
  RiskLevel,
  ReviewDecision,
  ReviewResult,
  DiffReviewState,
  ClassifiedChange,
  BreakingChange,
  ImpactedFile,
  RiskFinding,
} from "./types.js";
