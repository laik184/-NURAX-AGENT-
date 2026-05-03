import type { ValidationRule, ValidationEngine } from "../types.js";

export function mapRuleForEngine(rule: ValidationRule, engine: ValidationEngine): string {
  if (engine === "custom") {
    return `customRule(\"${rule.type}\", ${JSON.stringify(rule.value ?? null)}, ${JSON.stringify(rule.message)})`;
  }

  if (rule.type === "required") {
    return engine === "zod"
      ? `.min(1, ${JSON.stringify(rule.message)})`
      : `.required(${JSON.stringify(rule.message)})`;
  }

  if (rule.type === "min") {
    return `.min(${String(rule.value)}, ${JSON.stringify(rule.message)})`;
  }

  if (rule.type === "max") {
    return `.max(${String(rule.value)}, ${JSON.stringify(rule.message)})`;
  }

  if (rule.type === "regex") {
    return `.matches(new RegExp(${JSON.stringify(String(rule.value ?? ""))}), ${JSON.stringify(rule.message)})`;
  }

  if (rule.type === "async") {
    return `.test(${JSON.stringify(rule.validatorName ?? "asyncValidation")}, ${JSON.stringify(rule.message)}, async (value) => await asyncValidators.${rule.validatorName ?? "default"}(value))`;
  }

  return "";
}
