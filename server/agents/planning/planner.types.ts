/**
 * planner.types.ts
 *
 * Shared TypeScript interfaces for the Planner Agent system.
 * All planning data structures are defined here — never inline.
 */

export type AppType =
  | "saas"
  | "api"
  | "fullstack"
  | "cli"
  | "library"
  | "static"
  | "mobile"
  | "script"
  | "unknown";

export type Complexity = "trivial" | "simple" | "moderate" | "complex" | "large";

export type ExecutionStrategy = "single-pass" | "phased" | "iterative";

export interface ExecutionPhase {
  id: string;
  title: string;
  objective: string;
  dependencies: string[];
  files: string[];
  tools: string[];
  verification: string;
  priority: number;
  estimatedSteps: number;
}

export interface ExecutionPlan {
  goal: string;
  appType: AppType;
  stack: string[];
  phases: ExecutionPhase[];
  risks: string[];
  estimatedComplexity: Complexity;
  executionStrategy: ExecutionStrategy;
  generatedAt: number;
  runId: string;
  projectId: number;
}

export interface PhaseResult {
  phaseId: string;
  success: boolean;
  steps: number;
  summary: string;
  stopReason: string;
  error?: string;
  durationMs: number;
}

export interface PlannerResult {
  plan: ExecutionPlan;
  phaseResults: PhaseResult[];
  overallSuccess: boolean;
  totalSteps: number;
  durationMs: number;
}

export interface PlannerInput {
  projectId: number;
  runId: string;
  goal: string;
  systemPrompt?: string;
  maxStepsPerPhase?: number;
  signal?: AbortSignal;
}
