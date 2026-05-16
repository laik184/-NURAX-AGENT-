/**
 * server/tools/observation/observers/failure-classifier.ts
 *
 * Classifies tool failures into a structured FailureClass by scanning
 * the result error message and recent console output for known patterns.
 *
 * Single responsibility: pattern → FailureClass.
 * No side effects, pure function.
 */

import type { FailureClass } from "../types.ts";

interface ClassifierInput {
  toolName:    string;
  errorMsg:    string;
  consoleText: string;
  exitCode?:   number | null;
  timedOut?:   boolean;
}

interface ClassificationResult {
  failureClass: FailureClass;
  detail:       string;
}

// ── Pattern table — order matters (most specific first) ───────────────────────

const PATTERNS: Array<{ class: FailureClass; test: (i: ClassifierInput) => boolean }> = [
  {
    class: "timeout",
    test: (i) => !!i.timedOut || /timed? out/i.test(i.errorMsg),
  },
  {
    class: "compile_error",
    test: (i) =>
      /error TS\d+:|SyntaxError:.*\.ts|tsc.*error|Unexpected token|Cannot compile/i.test(i.consoleText + i.errorMsg) ||
      /\.ts\(\d+,\d+\): error/i.test(i.consoleText),
  },
  {
    class: "module_not_found",
    test: (i) =>
      /Cannot find module|MODULE_NOT_FOUND|cannot resolve|No such file.*node_modules/i.test(i.consoleText + i.errorMsg),
  },
  {
    class: "port_conflict",
    test: (i) => /EADDRINUSE|address already in use|port.*in use/i.test(i.consoleText + i.errorMsg),
  },
  {
    class: "permission_denied",
    test: (i) => /EACCES|permission denied|not permitted/i.test(i.consoleText + i.errorMsg),
  },
  {
    class: "file_not_found",
    test: (i) =>
      /ENOENT|no such file or directory|cannot find.*file/i.test(i.consoleText + i.errorMsg) &&
      !/(node_modules)/i.test(i.errorMsg),
  },
  {
    class: "network_error",
    test: (i) =>
      /ECONNREFUSED|ENOTFOUND|network.*error|fetch.*failed|curl.*failed|ETIMEDOUT/i.test(i.consoleText + i.errorMsg),
  },
  {
    class: "runtime_crash",
    test: (i) =>
      /process exited|uncaughtException|unhandledRejection|server.*crash|killed|SIGKILL|SIGTERM/i.test(
        i.consoleText + i.errorMsg,
      ),
  },
  {
    class: "validation_error",
    test: (i) => /validation failed|required field|must be a/i.test(i.errorMsg),
  },
  {
    class: "process_exit",
    test: (i) => typeof i.exitCode === "number" && i.exitCode !== 0,
  },
];

function extractDetail(failureClass: FailureClass, input: ClassifierInput): string {
  const combined = (input.errorMsg + "\n" + input.consoleText).slice(0, 1000);
  const lines = combined.split("\n").filter(Boolean);

  if (failureClass === "compile_error") {
    const tsErrors = lines.filter((l) => /error TS\d+:|\.ts\(\d+,\d+\)/i.test(l));
    return tsErrors.slice(0, 3).join("; ") || input.errorMsg.slice(0, 200);
  }
  if (failureClass === "module_not_found") {
    const match = combined.match(/Cannot find module ['"]([^'"]+)['"]/);
    return match ? `Missing: ${match[1]}` : input.errorMsg.slice(0, 200);
  }
  return input.errorMsg.slice(0, 200);
}

export function classifyFailure(input: ClassifierInput): ClassificationResult {
  for (const pattern of PATTERNS) {
    if (pattern.test(input)) {
      return { failureClass: pattern.class, detail: extractDetail(pattern.class, input) };
    }
  }
  return { failureClass: "unknown_error", detail: input.errorMsg.slice(0, 200) };
}
