import { transitionState } from "../state.js";
import type { AgentResult, EnumDefinition, SchemaGeneratorState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { toPascalCase } from "../utils/naming.util.js";
import { formatEnum } from "../utils/schema-formatter.util.js";

const SOURCE = "enum-builder";

export interface EnumBuilderInput {
  readonly enums: readonly EnumDefinition[];
  readonly state: Readonly<SchemaGeneratorState>;
}

export function buildEnums(
  input: EnumBuilderInput,
): Readonly<AgentResult & { blocks?: readonly string[] }> {
  const { enums, state } = input;

  if (enums.length === 0) {
    const log = buildLog(SOURCE, "No enums to generate");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, schema: "", logs: Object.freeze([log]) }),
      blocks: Object.freeze([]),
    };
  }

  const normalizedEnums: EnumDefinition[] = [];
  const errors: string[] = [];

  for (const enumDef of enums) {
    const name = toPascalCase(enumDef.name);

    if (enumDef.values.length === 0) {
      errors.push(`Enum "${name}" has no values`);
      continue;
    }

    const normalized: EnumDefinition = Object.freeze({
      name,
      values: Object.freeze(enumDef.values.map((v) =>
        Object.freeze({ name: v.name.toUpperCase(), ...(v.comment ? { comment: v.comment } : {}) }),
      )),
      ...(enumDef.comment ? { comment: enumDef.comment } : {}),
    });
    normalizedEnums.push(normalized);
  }

  if (errors.length > 0) {
    const msg = `Enum validation errors: ${errors.join("; ")}`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", logs: Object.freeze([buildLog(SOURCE, msg)]), error: "invalid_enum" }),
    };
  }

  const blocks = Object.freeze(normalizedEnums.map(formatEnum));
  const log = buildLog(SOURCE, `${normalizedEnums.length} enum(s) built: ${normalizedEnums.map((e) => e.name).join(", ")}`);

  return {
    nextState: transitionState(state, {
      enums: normalizedEnums,
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: blocks.join("\n\n"), logs: Object.freeze([log]) }),
    blocks,
  };
}
