/**
 * server/tools/registry/tool-security.ts
 *
 * Security layer for the unified tool registry.
 *
 * Responsibilities:
 *  - Centralised ALLOWED_COMMANDS list (single source of truth)
 *  - Sandbox path validation
 *  - Argument sanitisation
 *  - Audit logging
 */

import path from "path";

// ── Shell command allowlist (shared across shell_exec and package tools) ───────

export const ALLOWED_COMMANDS = new Set<string>([
  "npm", "npx", "node", "tsx", "ts-node",
  "git", "ls", "cat", "head", "tail", "echo",
  "mkdir", "touch", "grep", "find", "cp", "mv",
  "python", "python3", "pip", "pip3",
  "vite", "next", "tsc", "eslint",
  "drizzle-kit", "prisma",
  "curl", "wget", "which", "env", "printenv",
  "chmod", "pwd", "rm", "df", "du", "ps",
]);

// ── Sandbox root ──────────────────────────────────────────────────────────────

const SANDBOX_ROOT = path.resolve(
  process.env.AGENT_PROJECT_ROOT || ".sandbox",
);

// ── Path validation ───────────────────────────────────────────────────────────

export interface PathValidationResult {
  valid: boolean;
  reason?: string;
  resolvedPath?: string;
}

/**
 * Verify that a resolved absolute path is inside the sandbox root.
 * Prevents path-traversal attacks via tool arguments.
 */
export function validateSandboxPath(absolutePath: string): PathValidationResult {
  const resolved = path.resolve(absolutePath);

  if (!resolved.startsWith(SANDBOX_ROOT)) {
    return {
      valid: false,
      reason: `Path "${resolved}" is outside sandbox root "${SANDBOX_ROOT}"`,
    };
  }

  return { valid: true, resolvedPath: resolved };
}

// ── Command validation ────────────────────────────────────────────────────────

export interface CommandValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateCommand(command: string): CommandValidationResult {
  if (!ALLOWED_COMMANDS.has(command)) {
    return {
      valid: false,
      reason: `Command "${command}" is not in the allowlist. Allowed: ${[...ALLOWED_COMMANDS].join(", ")}`,
    };
  }
  return { valid: true };
}

// ── Argument sanitisation ─────────────────────────────────────────────────────

const DANGEROUS_PATTERNS = [
  /;\s*(rm|dd|mkfs|format)\s/i,
  /\|\s*(sh|bash|zsh|fish)\s/i,
  /`[^`]+`/,
  /\$\([^)]+\)/,
];

export function sanitizeArgs(args: Record<string, unknown>): { safe: boolean; reason?: string } {
  const flat = JSON.stringify(args);
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(flat)) {
      return { safe: false, reason: `Argument contains dangerous pattern: ${pattern.source}` };
    }
  }
  return { safe: true };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

interface AuditEntry {
  ts: number;
  tool: string;
  projectId: number;
  runId: string;
  ok: boolean;
  durationMs: number;
}

const _auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 500;

export function auditLog(entry: AuditEntry): void {
  _auditLog.push(entry);
  if (_auditLog.length > MAX_AUDIT_ENTRIES) {
    _auditLog.shift();
  }
}

export function getAuditLog(limit = 50): AuditEntry[] {
  return _auditLog.slice(-limit);
}
