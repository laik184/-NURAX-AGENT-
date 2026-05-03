import { ErrorType } from '../types.js';
import { matchErrorType } from '../utils/error-pattern.util.js';

export const errorClassifierAgent = (error: string, normalizedLogs: string[]): ErrorType => {
  const mergedText = [error, ...normalizedLogs].join('\n');
  return matchErrorType(mergedText);
};
