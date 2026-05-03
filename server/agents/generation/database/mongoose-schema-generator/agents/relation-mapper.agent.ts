import { transitionState } from "../state.js";
import type { AgentResult, MongooseSchemaState, RelationDefinition } from "../types.js";
import { buildLog } from "../utils/logger.util.js";

const SOURCE = "relation-mapper";

export interface RelationMapperInput {
  readonly relations: readonly RelationDefinition[];
  readonly state: Readonly<MongooseSchemaState>;
}

export interface MappedRelation {
  readonly relation: Readonly<RelationDefinition>;
  readonly schemaLine: string;
  readonly populatePath: string;
}

function renderRelationBody(rel: RelationDefinition): string {
  const parts = [`type: Schema.Types.ObjectId`, `ref: "${rel.refModel}"`];
  if (rel.isArray) {
    return `[{ ${parts.join(", ")} }]`;
  }
  return `{ ${parts.join(", ")} }`;
}

export function mapRelations(
  input: RelationMapperInput,
): Readonly<AgentResult & { mappedRelations?: readonly MappedRelation[] }> {
  const { relations, state } = input;

  if (relations.length === 0) {
    const log = buildLog(SOURCE, "No relations to map");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, schema: "", indexes: Object.freeze([]), logs: Object.freeze([log]) }),
      mappedRelations: Object.freeze([]),
    };
  }

  const mapped: MappedRelation[] = relations.map((rel) => {
    const schemaLine = renderRelationBody(rel);
    return Object.freeze({
      relation: rel,
      schemaLine,
      populatePath: rel.fieldName,
    });
  });

  const log = buildLog(SOURCE, `${mapped.length} relation(s) mapped: ${mapped.map((r) => `${r.relation.fieldName} → ${r.relation.refModel}`).join(", ")}`);

  return {
    nextState: transitionState(state, {
      relations,
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: "", indexes: Object.freeze([]), logs: Object.freeze([log]) }),
    mappedRelations: Object.freeze(mapped),
  };
}
