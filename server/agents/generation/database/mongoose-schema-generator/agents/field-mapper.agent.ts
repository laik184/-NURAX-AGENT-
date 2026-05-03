import { transitionState } from "../state.js";
import type { AgentResult, FieldDefinition, MongooseSchemaState, SchemaConfig } from "../types.js";
import { formatDefaultValue, hasDefault } from "../utils/default-values.util.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { mapToMongooseType } from "../utils/type-mapper.util.js";

const SOURCE = "field-mapper";

export interface FieldMapperInput {
  readonly config: Readonly<SchemaConfig>;
  readonly state: Readonly<MongooseSchemaState>;
}

export interface MappedField {
  readonly definition: Readonly<FieldDefinition>;
  readonly mongooseType: string;
  readonly schemaLine: string;
}

function renderFieldBody(field: FieldDefinition, mongooseType: string): string {
  const parts: string[] = [`type: ${mongooseType}`];

  if (field.validation?.required) {
    if (Array.isArray(field.validation.required)) {
      parts.push(`required: [${field.validation.required[0]}, "${field.validation.required[1]}"]`);
    } else {
      parts.push(`required: true`);
    }
  }

  if (hasDefault(field.defaultValue)) {
    const dv = formatDefaultValue(field.defaultValue);
    if (dv) parts.push(`default: ${dv}`);
  }

  if (field.validation?.unique) parts.push(`unique: true`);
  if (field.validation?.trim) parts.push(`trim: true`);
  if (field.validation?.lowercase) parts.push(`lowercase: true`);
  if (field.validation?.uppercase) parts.push(`uppercase: true`);

  if (field.validation?.enum?.values.length) {
    const vals = field.validation.enum.values.map((v) => `"${v}"`).join(", ");
    parts.push(`enum: [${vals}]`);
  }

  if (field.validation?.range) {
    const r = field.validation.range;
    if (r.min !== undefined) parts.push(`min: ${r.min}`);
    if (r.max !== undefined) parts.push(`max: ${r.max}`);
    if (r.minLength !== undefined) parts.push(`minlength: ${r.minLength}`);
    if (r.maxLength !== undefined) parts.push(`maxlength: ${r.maxLength}`);
  }

  if (field.validation?.match) parts.push(`match: ${field.validation.match}`);
  if (field.ref) parts.push(`ref: "${field.ref}"`);

  if (parts.length === 1) return mongooseType;
  return `{\n      ${parts.join(",\n      ")}\n    }`;
}

export function mapFields(input: FieldMapperInput): Readonly<AgentResult & { mappedFields?: readonly MappedField[] }> {
  const { config, state } = input;

  if (!config.fields || config.fields.length === 0) {
    const msg = `No fields provided for schema "${config.name}"`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", indexes: Object.freeze([]), logs: Object.freeze([buildLog(SOURCE, msg)]), error: "no_fields" }),
    };
  }

  const mapped: MappedField[] = config.fields.map((field) => {
    const mongooseType = mapToMongooseType(field.type);
    const body = renderFieldBody(field, mongooseType);
    const schemaLine = field.isArray ? `[${body}]` : body;
    return Object.freeze({ definition: field, mongooseType, schemaLine });
  });

  const log = buildLog(SOURCE, `${mapped.length} field(s) mapped for "${config.name}"`);

  return {
    nextState: transitionState(state, {
      schemaName: config.name,
      fields: config.fields,
      status: "GENERATING",
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: "", indexes: Object.freeze([]), logs: Object.freeze([log]) }),
    mappedFields: Object.freeze(mapped),
  };
}
