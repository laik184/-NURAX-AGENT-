import type { CodeFile, PlannedStructure, ValidationResult } from "../types.js";
import { isValidFileName, normalizePath } from "../utils/naming.util.js";

export class OutputValidatorAgent {
  validate(files: readonly CodeFile[], plan: PlannedStructure): ValidationResult {
    const logs: string[] = [];
    const expected = new Set(plan.files.map((file) => normalizePath(file)));
    const observed = new Set<string>();

    for (const file of files) {
      const path = normalizePath(file.path);
      observed.add(path);

      if (!isValidFileName(path)) {
        return Object.freeze({
          valid: false,
          logs: Object.freeze([...logs, `Invalid file naming: ${path}`]),
          error: `Invalid file naming: ${path}`,
        });
      }

      if (!file.content.trim()) {
        return Object.freeze({
          valid: false,
          logs: Object.freeze([...logs, `Empty file content: ${path}`]),
          error: `Empty file content: ${path}`,
        });
      }
    }

    const duplicates = files.length - observed.size;
    if (duplicates > 0) {
      logs.push(`Removed ${duplicates} duplicate file entries.`);
    }

    for (const required of expected) {
      if (!observed.has(required)) {
        return Object.freeze({
          valid: false,
          logs: Object.freeze([...logs, `Missing required file: ${required}`]),
          error: `Missing required file: ${required}`,
        });
      }
    }

    return Object.freeze({
      valid: true,
      logs: Object.freeze([...logs, "Output validation passed."]),
    });
  }
}
