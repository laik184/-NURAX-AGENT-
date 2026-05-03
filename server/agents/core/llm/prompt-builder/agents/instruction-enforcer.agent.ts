import { cleanString } from "../utils/string-cleaner.util.js";

export function enforceInstructions(systemPrompt: string, userPrompt: string): {
  readonly systemPrompt: string;
  readonly userPrompt: string;
} {
  const safeSystem = cleanString(systemPrompt);
  const safeUser = cleanString(userPrompt);

  const enforcedSystem = safeSystem.includes("Follow response format")
    ? safeSystem
    : `${safeSystem}\nFollow response format, preserve clarity, and avoid unsupported claims.`;

  return Object.freeze({
    systemPrompt: enforcedSystem,
    userPrompt: safeUser,
  });
}
