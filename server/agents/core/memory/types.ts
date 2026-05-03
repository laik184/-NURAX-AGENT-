export type MemoryType = "short" | "long" | "pattern";

export type MemoryDecisionKind = "SAVE" | "IGNORE";

export interface MemoryInput {
  readonly id: string;
  readonly content: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly sessionId?: string;
  readonly timestamp: number;
  readonly tags?: readonly string[];
  readonly source?: string;
  readonly success?: boolean;
  readonly failed?: boolean;
}

export interface MemoryItem {
  readonly id: string;
  readonly content: string;
  readonly type: MemoryType;
  readonly score: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly accessCount: number;
  readonly lastAccessedAt: number;
  readonly sessionId?: string;
  readonly tags: readonly string[];
  readonly source?: string;
  readonly decayFactor: number;
  readonly patternKey?: string;
}

export interface MemoryScore {
  readonly total: number;
  readonly success: number;
  readonly repetition: number;
  readonly complexity: number;
  readonly rarity: number;
  readonly breakdown: Readonly<Record<string, number>>;
}

export interface MemoryDecision {
  readonly kind: MemoryDecisionKind;
  readonly reason: string;
  readonly score: number;
}

export interface MemoryQuery {
  readonly context?: string;
  readonly tags?: readonly string[];
  readonly type?: MemoryType;
  readonly sessionId?: string;
  readonly limit?: number;
  readonly minScore?: number;
}

export interface MemoryResult {
  readonly success: boolean;
  readonly stored: boolean;
  readonly type?: MemoryType;
  readonly score: number;
  readonly retrieved?: readonly MemoryItem[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface MemoryState {
  readonly shortTerm: readonly MemoryItem[];
  readonly longTerm: readonly MemoryItem[];
  readonly patterns: readonly MemoryItem[];
  readonly lastUpdated: number;
}

export interface ClassificationResult {
  readonly type: MemoryType;
  readonly reason: string;
}

export interface DeduplicationResult {
  readonly isDuplicate: boolean;
  readonly existingId?: string;
  readonly similarity: number;
}

export interface CleanResult {
  readonly removed: number;
  readonly compressed: number;
  readonly logs: readonly string[];
}

export interface LearningResult {
  readonly patternsExtracted: number;
  readonly patternsUpdated: number;
  readonly logs: readonly string[];
}
