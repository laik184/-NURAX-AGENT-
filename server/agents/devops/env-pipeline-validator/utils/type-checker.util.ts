import type { EnvValueType } from "../types.js";
import { testPattern } from "./regex.util.js";

export function checkType(value: string, type: EnvValueType): boolean {
  if (value === undefined || value === null) return false;

  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return !isNaN(Number(value)) && value.trim() !== "";
    case "boolean":
      return value === "true" || value === "false" || value === "1" || value === "0";
    case "url":
      return testPattern(value, "url");
    case "email":
      return testPattern(value, "email");
    case "port": {
      const n = Number(value);
      return testPattern(value, "port") && n >= 1 && n <= 65535;
    }
    case "token":
      return value.length >= 16 && testPattern(value, "token");
    case "json":
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    default:
      return true;
  }
}

export function coerceValue(value: string, type: EnvValueType): unknown {
  switch (type) {
    case "number":
      return Number(value);
    case "boolean":
      return value === "true" || value === "1";
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    default:
      return value;
  }
}

export function typeDescription(type: EnvValueType): string {
  const descriptions: Readonly<Record<EnvValueType, string>> = Object.freeze({
    string: "non-empty string",
    number: "numeric value",
    boolean: "true/false or 1/0",
    url: "valid HTTP/HTTPS URL",
    email: "valid email address",
    port: "integer between 1 and 65535",
    token: "alphanumeric token ≥16 chars",
    json: "valid JSON string",
  });
  return descriptions[type];
}
