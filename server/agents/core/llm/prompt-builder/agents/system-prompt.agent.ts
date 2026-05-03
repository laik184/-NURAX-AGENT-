import { cleanString } from "../utils/string-cleaner.util.js";

const DEFAULT_SYSTEM_PROMPT = [
  "You are a helpful AI assistant.",
  "Provide accurate, structured, and concise responses.",
  "Respect all explicit user instructions and safety constraints.",
].join(" ");

export function buildSystemPrompt(input?: string): string {
  return cleanString(input && input.trim().length > 0 ? input : DEFAULT_SYSTEM_PROMPT);
}
