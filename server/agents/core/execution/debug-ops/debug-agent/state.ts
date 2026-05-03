export type DebugStatus = 'IDLE' | 'ANALYZING' | 'DONE' | 'FAILED';

export interface DebugAgentState {
  error: string;
  stacktrace: string[];
  type: string;
  rootCause: string;
  confidence: number;
  suggestions: string[];
  logs: string[];
  status: DebugStatus;
}

export const createInitialState = (error = '', logs: string[] = [], stacktrace: string[] = []): Readonly<DebugAgentState> =>
  Object.freeze({
    error,
    stacktrace: [...stacktrace],
    type: 'UNKNOWN',
    rootCause: '',
    confidence: 0,
    suggestions: [],
    logs: [...logs],
    status: 'IDLE' as const,
  });
