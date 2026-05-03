import type { PatchType, PatchResult } from "../patch-engine/index.js";

export type FileTree = Readonly<Record<string, string>>;

// ─── Smell types (self-contained — no external module dependency) ─────────────

export type SmellSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SmellKind =
  | "large-file"
  | "god-class"
  | "high-complexity"
  | "deep-nesting"
  | "tight-coupling"
  | "duplicate-logic"
  | "large-controller"
  | "excessive-deps"
  | string;

export interface SourceFile {
  readonly filePath: string;
  readonly content: string;
  readonly language?: string;
}

export interface SmellItem {
  readonly filePath: string;
  readonly kind: SmellKind;
  readonly description: string;
  readonly severity: SmellSeverity;
  readonly line?: number;
  readonly column?: number;
}

export interface SmellReport {
  readonly sourceFiles: readonly SourceFile[];
  readonly smells: readonly SmellItem[];
  readonly totalSmells: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly generatedAt: number;
}

// ─── Fix strategy (self-contained) ───────────────────────────────────────────

export type FixAction =
  | "ASYNC_REFACTOR"
  | "WORKER_THREAD_INJECTION"
  | "SYNC_REDUCTION"
  | "PAYLOAD_OPTIMIZATION"
  | "CACHE_INJECTION"
  | "NO_ACTION";

export interface FixStrategy {
  readonly action: FixAction;
  readonly reason: string;
  readonly confidence: number;
  readonly targetPattern?: string;
}

// ─── Fixer options ────────────────────────────────────────────────────────────

export interface FixerOptions {
  readonly maxIterations?: number;
  readonly runTests?: boolean;
  readonly runLint?: boolean;
  readonly runTypecheck?: boolean;
  readonly runtime?: string;
}

export interface CodeFixerInput {
  readonly codebase: string | FileTree;
  readonly options?: FixerOptions;
}

export interface NormalizedFixerInput {
  readonly codebase: FileTree;
  readonly options: Required<FixerOptions>;
}

export interface FixStep {
  readonly iteration: number;
  readonly filePath: string;
  readonly smellKind: string;
  readonly patchType: PatchType;
  readonly strategyAction: string;
  readonly status: "SUCCESS" | "SKIPPED" | "INVALID";
  readonly reason: string;
}

export interface Diff {
  readonly filePath: string;
  readonly before: string;
  readonly after: string;
  readonly unifiedDiff: string;
  readonly linesAdded: number;
  readonly linesRemoved: number;
  readonly linesChanged: number;
}

export interface VerificationResult {
  readonly passed: boolean;
  readonly checks: ReadonlyArray<VerificationCheckResult>;
  readonly summary: string;
}

export interface VerificationCheckResult {
  readonly check: "typecheck" | "lint" | "tests";
  readonly passed: boolean;
  readonly details: string;
}

export interface FixLoopIteration {
  readonly iteration: number;
  readonly smells: ReadonlyArray<SmellItem>;
  readonly plans: ReadonlyArray<FixPlan>;
  readonly applied: ReadonlyArray<FixStep>;
  readonly failed: ReadonlyArray<FixStep>;
  readonly verification: VerificationResult;
}

export interface RetryDecision {
  readonly shouldRetry: boolean;
  readonly reason: string;
}

export interface FixLoopResult {
  readonly finalCodebase: FileTree;
  readonly iterations: number;
  readonly appliedFixes: ReadonlyArray<FixStep>;
  readonly failedFixes: ReadonlyArray<FixStep>;
  readonly finalVerification: VerificationResult;
  readonly smellReport: SmellReport;
  readonly history: ReadonlyArray<FixLoopIteration>;
}

export interface FixResult {
  readonly fixedCode: string | FileTree;
  readonly diffs: ReadonlyArray<Diff>;
  readonly appliedFixes: ReadonlyArray<FixStep>;
  readonly failedFixes: ReadonlyArray<FixStep>;
  readonly iterations: number;
  readonly confidence: number;
  readonly success: boolean;
}

export interface FixPlan {
  readonly filePath: string;
  readonly smell: SmellItem;
  readonly strategy: FixStrategy;
  readonly patchType: PatchType;
  readonly targetHint: string | null;
}

export interface PatchApplicationResult {
  readonly updatedCodebase: FileTree;
  readonly appliedFixes: ReadonlyArray<FixStep>;
  readonly failedFixes: ReadonlyArray<FixStep>;
  readonly patchResults: ReadonlyArray<PatchResult>;
}

export interface CodeSmellDetector {
  detect(input: { readonly sourceFiles: readonly SourceFile[]; readonly now?: number }): {
    readonly ok: boolean;
    readonly data?: SmellReport;
    readonly error?: string;
  };
}

export interface AutoFixStrategyAgent {
  analyze(
    sessionId: string,
    error: { readonly message: string; readonly code?: string; readonly stack?: string },
    context: { readonly runtime: string; readonly retryCount: number; readonly maxRetries: number },
  ): {
    readonly ok: boolean;
    readonly data?: FixStrategy;
    readonly error?: string;
  };
}

export interface PatchEngine {
  applyPatch(request: { readonly code: string; readonly patchType: PatchType; readonly targetHint: string | null }): PatchResult;
}

export interface TestRunner {
  runTypecheck?(codebase: FileTree): VerificationCheckResult;
  runLint?(codebase: FileTree): VerificationCheckResult;
  runTests?(codebase: FileTree): VerificationCheckResult;
}

export interface CodeFixerDependencies {
  readonly smellDetector: CodeSmellDetector;
  readonly strategyAgent: AutoFixStrategyAgent;
  readonly patchEngine: PatchEngine;
  readonly testRunner?: TestRunner;
}
