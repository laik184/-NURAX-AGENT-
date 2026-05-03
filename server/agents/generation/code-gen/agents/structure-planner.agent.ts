import type { CodeRequest, PlannedStructure } from "../types.js";
import { normalizePath } from "../utils/naming.util.js";

export class StructurePlannerAgent {
  plan(request: CodeRequest): PlannedStructure {
    const intentSlug = normalizePath(request.intent).replace(/[^a-z0-9-/]/g, "");
    const root = `generated/${intentSlug || "module"}`;

    const files = [
      `${root}/controller.ts`,
      `${root}/service.ts`,
      `${root}/repository.ts`,
      `${root}/types.ts`,
      `${root}/index.ts`,
    ];

    return Object.freeze({
      files: Object.freeze(files),
      rationale: Object.freeze([
        "Layered layout with separation of route/controller/service/repository concerns.",
        "Stable module boundaries to avoid business logic leakage.",
      ]),
    });
  }
}
