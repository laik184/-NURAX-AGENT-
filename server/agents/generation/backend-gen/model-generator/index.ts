import { generateModel } from "./orchestrator.js";
import { validateSchema } from "./agents/schema-parser.agent.js";
import type { SupportedOrm } from "./types.js";

const SUPPORTED_ORMS: readonly SupportedOrm[] = Object.freeze([
  "prisma",
  "sequelize",
  "typeorm",
  "mongoose",
]);

export { generateModel, validateSchema };

export function getSupportedORMs(): readonly SupportedOrm[] {
  return SUPPORTED_ORMS;
}
