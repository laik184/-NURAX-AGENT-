/**
 * server/tools/registry/tool-validator.ts
 *
 * Argument validation for the unified tool registry.
 *
 * Validates that all required fields are present and that value types
 * match the tool's JSON-schema parameter definitions.
 */

import type { Tool } from "./tool-types.ts";

// ── Validation result ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── JSON schema type → JS type guard ─────────────────────────────────────────

function matchesType(value: unknown, schemaType: string): boolean {
  if (schemaType === "string")  return typeof value === "string";
  if (schemaType === "number")  return typeof value === "number";
  if (schemaType === "boolean") return typeof value === "boolean";
  if (schemaType === "object")  return typeof value === "object" && value !== null && !Array.isArray(value);
  if (schemaType === "array")   return Array.isArray(value);
  return true;
}

// ── Core validator ────────────────────────────────────────────────────────────

/**
 * Validate that `args` satisfy the tool's parameter schema.
 * Checks required fields are present and optionally that types match.
 */
export function validateToolArgs(
  tool: Tool,
  args: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  const { required = [], properties = {} } = tool.parameters;

  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    const schema = properties[key] as { type?: string } | undefined;
    if (!schema) continue;
    if (schema.type && !matchesType(value, schema.type)) {
      errors.push(
        `Field "${key}" expected type "${schema.type}" but got "${typeof value}"`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that args is a plain object (guards against null / array injection).
 */
export function validateArgsShape(
  args: unknown,
): args is Record<string, unknown> {
  return (
    typeof args === "object" &&
    args !== null &&
    !Array.isArray(args)
  );
}

/**
 * Validate context fields.
 */
export function validateContext(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== "object") return "ctx must be an object";
  const c = ctx as Record<string, unknown>;
  if (typeof c.projectId !== "number") return "ctx.projectId must be a number";
  if (typeof c.runId !== "string")     return "ctx.runId must be a string";
  return null;
}
