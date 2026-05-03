export type ReviewDecision = "APPROVE" | "REJECT" | "WARN";

export type ChangeType = "add" | "remove" | "modify";

export type RiskLevel = "low" | "medium" | "critical";

export interface DiffInput {
  readonly diffId: string;
  readonly diff: string;
  readonly basePath?: string;
}

export interface FileChange {
  readonly filePath: string;
  readonly addedLines: readonly string[];
  readonly removedLines: readonly string[];
  readonly hunks: readonly string[];
}

export interface ClassifiedChange extends FileChange {
  readonly changeType: ChangeType;
}

export interface RiskFinding {
  readonly filePath: string;
  readonly level: RiskLevel;
  readonly category: "security" | "performance" | "logic";
  readonly message: string;
}

export interface BreakingChange {
  readonly filePath: string;
  readonly reason: string;
}

export interface ImpactedFile {
  readonly sourceFile: string;
  readonly impactedFile: string;
  readonly reason: string;
}

export interface ReviewResult {
  readonly success: boolean;
  readonly decision: ReviewDecision;
  readonly risks: readonly RiskFinding[];
  readonly breakingChanges: readonly BreakingChange[];
  readonly impactedFiles: readonly ImpactedFile[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface DiffReviewState {
  readonly diffId: string;
  readonly filesChanged: readonly string[];
  readonly changes: readonly ClassifiedChange[];
  readonly risks: readonly RiskFinding[];
  readonly decision: ReviewDecision;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}
