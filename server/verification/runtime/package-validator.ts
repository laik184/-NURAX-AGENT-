/**
 * package-validator.ts
 *
 * Detect failed npm package installs from recent log lines.
 *
 * Looks for patterns indicating npm install failure:
 *   - non-zero npm exit codes
 *   - "npm ERR! code E404" (package not found)
 *   - "Cannot find module X" where X is likely an npm package
 *   - "npm warn deprecated" followed by failures
 *
 * Ownership: verification/runtime — package failure detection only. Pure.
 */

import { logBuffer }        from "../../runtime/observer/log-buffer.ts";
import type { CheckResult } from "../types.ts";

// ─── Patterns ─────────────────────────────────────────────────────────────────

const FAILURE_PATTERNS: RegExp[] = [
  /npm err!/i,
  /npm error/i,
  /err_invalid_package_name/i,
  /code e\d{3}/i,
  /e404/i,
  /unable to resolve dependency tree/i,
  /peer dep missing/i,
  /could not resolve/i,
];

const MISSING_MODULE_RE = /cannot find module ['"]([^'"]+)['"]/i;
const LOG_TAIL = 80;

// ─── Validator ────────────────────────────────────────────────────────────────

export async function checkPackageInstall(projectId: number): Promise<CheckResult> {
  const lines = logBuffer.tail(projectId, LOG_TAIL);
  const failures: string[] = [];
  const missingModules = new Set<string>();

  for (const { text } of lines) {
    if (FAILURE_PATTERNS.some(p => p.test(text))) {
      failures.push(text.slice(0, 200));
      if (failures.length >= 5) break;
    }
    const match = MISSING_MODULE_RE.exec(text);
    if (match) missingModules.add(match[1]);
  }

  if (failures.length === 0 && missingModules.size === 0) {
    return {
      name:    "package_install",
      status:  "passed",
      message: "No npm install failures detected.",
    };
  }

  const detail: string[] = [];
  if (missingModules.size > 0) {
    detail.push(`Missing modules: ${[...missingModules].join(", ")}. Run package_install to add them.`);
  }
  if (failures.length > 0) {
    detail.push(`npm errors:\n${failures.map(f => `  • ${f}`).join("\n")}`);
  }

  return {
    name:    "package_install",
    status:  "failed",
    message: `Package install issue(s): ${missingModules.size} missing module(s), ${failures.length} npm error(s).`,
    detail:  detail.join("\n"),
  };
}
