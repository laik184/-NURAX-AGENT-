import type { ErrorInfo } from "../types";

const HALLUCINATION_PATTERNS = [
  /as an ai language model/i,
  /i cannot access/i,
  /i do not have browsing/i,
];

export const detectResponseErrors = (response: string): ErrorInfo[] => {
  const errors: ErrorInfo[] = [];

  if (!response || !response.trim()) {
    errors.push({
      code: "EMPTY_RESPONSE",
      message: "Response is empty.",
    });
  }

  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(response)) {
      errors.push({
        code: "HALLUCINATION_PATTERN",
        message: "Response contains unsupported meta/disclaimer content.",
        details: pattern.toString(),
      });
      break;
    }
  }

  return errors;
};
