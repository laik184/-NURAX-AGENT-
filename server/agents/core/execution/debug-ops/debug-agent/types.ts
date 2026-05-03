export type ErrorType = 'SYNTAX' | 'RUNTIME' | 'DEPENDENCY' | 'NETWORK' | 'ENVIRONMENT' | 'UNKNOWN';

export interface DebugInput {
  error: string;
  logs?: string[];
  stacktrace?: string[];
  environment?: Record<string, string | undefined>;
}

export interface RootCause {
  summary: string;
  evidence: string[];
}

export interface FixSuggestion {
  action: string;
  reason: string;
  confidence: number;
}

export interface DebugResult {
  success: boolean;
  errorType: ErrorType;
  rootCause: string;
  confidence: number;
  suggestions: string[];
  logs: string[];
}

export interface ParsedStackFrame {
  file?: string;
  line?: number;
  column?: number;
  functionName?: string;
  raw: string;
}

export interface ParsedStackTrace {
  normalized: string[];
  frames: ParsedStackFrame[];
}
