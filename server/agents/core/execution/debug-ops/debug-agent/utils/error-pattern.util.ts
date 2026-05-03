import { ErrorType } from '../types.js';

const ERROR_PATTERNS: Array<{ type: ErrorType; regex: RegExp[] }> = [
  { type: 'DEPENDENCY', regex: [/Cannot find module/i, /Module not found/i, /ERR_MODULE_NOT_FOUND/i] },
  { type: 'SYNTAX', regex: [/SyntaxError/i, /Unexpected token/i, /Unexpected identifier/i] },
  { type: 'NETWORK', regex: [/ECONNREFUSED/i, /ENOTFOUND/i, /ETIMEDOUT/i, /NetworkError/i] },
  { type: 'ENVIRONMENT', regex: [/Missing env/i, /undefined environment variable/i, /process\.env\.[A-Z0-9_]+/i] },
  {
    type: 'RUNTIME',
    regex: [/TypeError/i, /ReferenceError/i, /RangeError/i, /UnhandledPromiseRejection/i, /Cannot read properties/i],
  },
];

export const matchErrorType = (text: string): ErrorType => {
  for (const item of ERROR_PATTERNS) {
    if (item.regex.some((pattern) => pattern.test(text))) {
      return item.type;
    }
  }

  return 'UNKNOWN';
};
