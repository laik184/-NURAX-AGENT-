import { ErrorType, ParsedStackFrame, RootCause } from '../types.js';

const summarizeFrame = (frame?: ParsedStackFrame): string => {
  if (!frame) {
    return 'No concrete stack frame was found.';
  }

  const filePart = frame.file ? `${frame.file}:${frame.line ?? '?'}:${frame.column ?? '?'}` : 'unknown file';
  const fnPart = frame.functionName ? ` in ${frame.functionName}` : '';
  return `Failing frame ${filePart}${fnPart}.`;
};

export const rootCauseAnalyzerAgent = (errorType: ErrorType, error: string, frames: ParsedStackFrame[]): RootCause => {
  const firstFrame = frames[0];
  const frameEvidence = summarizeFrame(firstFrame);

  switch (errorType) {
    case 'DEPENDENCY':
      return {
        summary: 'Runtime failed due to unresolved dependency/module import.',
        evidence: [frameEvidence, error],
      };
    case 'ENVIRONMENT':
      return {
        summary: 'Runtime failed because required environment configuration is missing or invalid.',
        evidence: [frameEvidence, error],
      };
    case 'NETWORK':
      return {
        summary: 'Execution failed because service/network connectivity could not be established.',
        evidence: [frameEvidence, error],
      };
    case 'SYNTAX':
      return {
        summary: 'Execution stopped at parse/compile phase due to invalid syntax.',
        evidence: [frameEvidence, error],
      };
    case 'RUNTIME':
      return {
        summary: 'Application logic triggered a runtime exception in active execution path.',
        evidence: [frameEvidence, error],
      };
    default:
      return {
        summary: 'Unable to isolate root cause with high certainty from provided traces.',
        evidence: [frameEvidence, error],
      };
  }
};
