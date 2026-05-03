import { cleanString } from "../utils/string-cleaner.util.js";

export function buildUserPrompt(userInput: string): string {
  const normalized = cleanString(userInput);
  if (!normalized) return "User input missing.";
  return `User request:\n${normalized}`;
}
