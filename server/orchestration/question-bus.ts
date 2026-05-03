/**
 * question-bus.ts
 * Manages pending agent questions — the agent emits agent.question and then
 * awaits a Promise.  When the user clicks an option in ChatPanel, the frontend
 * POSTs /api/chat/answer which calls resolveQuestion() here, unblocking the
 * agent loop so it can continue with the user's choice.
 */

interface PendingQuestion {
  resolve: (answer: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingQuestion>();

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Register a pending question. Returns a Promise that resolves when the user
 * answers (or rejects after TIMEOUT_MS, falling back to defaultAnswer).
 */
export function waitForAnswer(
  runId: string,
  questionId: string,
  defaultAnswer: string,
): Promise<string> {
  return new Promise<string>((resolve) => {
    const key = `${runId}::${questionId}`;

    const timer = setTimeout(() => {
      if (pending.delete(key)) {
        resolve(defaultAnswer);
      }
    }, TIMEOUT_MS);

    pending.set(key, { resolve, timer });
  });
}

/**
 * Called from the chat answer API when the user clicks an option.
 * Returns true if a matching pending question was found and resolved.
 */
export function resolveQuestion(
  runId: string,
  questionId: string,
  answer: string,
): boolean {
  const key = `${runId}::${questionId}`;
  const entry = pending.get(key);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(key);
  entry.resolve(answer);
  return true;
}

/** How many questions are currently waiting. */
export function pendingCount(): number {
  return pending.size;
}
