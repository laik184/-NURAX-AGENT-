import type { FieldDefinition, RelationDefinition } from "../types.js";
import { toForeignKeyName, toRelationFieldName } from "./naming.util.js";

export interface RelationFields {
  readonly ownerFields: readonly FieldDefinition[];
  readonly referenceFields: readonly FieldDefinition[];
}

export function buildOneToOneFields(rel: Readonly<RelationDefinition>): RelationFields {
  const fkField = rel.fromField ?? toForeignKeyName(rel.toModel);
  const refField = rel.toField ?? "id";
  const relationName = rel.name ? `"${rel.name}"` : undefined;
  const relArgs = [
    `fields: [${fkField}]`,
    `references: [${refField}]`,
    ...(rel.onDelete ? [`onDelete: ${rel.onDelete}`] : []),
    ...(rel.onUpdate ? [`onUpdate: ${rel.onUpdate}`] : []),
    ...(relationName ? [`map: ${relationName}`] : []),
  ];

  const ownerFields: FieldDefinition[] = [
    Object.freeze({
      name: toRelationFieldName(rel.toModel),
      type: rel.toModel,
      isOptional: true,
      isList: false,
      attributes: Object.freeze([
        Object.freeze({ name: "relation", args: Object.freeze(relArgs) }),
      ]),
    }),
    Object.freeze({
      name: fkField,
      type: "String",
      isOptional: true,
      isList: false,
      attributes: Object.freeze([Object.freeze({ name: "unique" })]),
    }),
  ];

  const referenceFields: FieldDefinition[] = [
    Object.freeze({
      name: toRelationFieldName(rel.fromModel),
      type: rel.fromModel,
      isOptional: true,
      isList: false,
      attributes: Object.freeze([]),
    }),
  ];

  return Object.freeze({ ownerFields: Object.freeze(ownerFields), referenceFields: Object.freeze(referenceFields) });
}

export function buildOneToManyFields(rel: Readonly<RelationDefinition>): RelationFields {
  const fkField = rel.fromField ?? toForeignKeyName(rel.fromModel);
  const refField = rel.toField ?? "id";
  const relationName = rel.name ? `"${rel.name}"` : undefined;
  const relArgs = [
    `fields: [${fkField}]`,
    `references: [${refField}]`,
    ...(rel.onDelete ? [`onDelete: ${rel.onDelete}`] : []),
    ...(rel.onUpdate ? [`onUpdate: ${rel.onUpdate}`] : []),
    ...(relationName ? [`map: ${relationName}`] : []),
  ];

  const ownerFields: FieldDefinition[] = [
    Object.freeze({
      name: toRelationFieldName(rel.toModel),
      type: rel.toModel,
      isOptional: false,
      isList: false,
      attributes: Object.freeze([
        Object.freeze({ name: "relation", args: Object.freeze(relArgs) }),
      ]),
    }),
    Object.freeze({
      name: fkField,
      type: "String",
      isOptional: false,
      isList: false,
      attributes: Object.freeze([]),
    }),
  ];

  const referenceFields: FieldDefinition[] = [
    Object.freeze({
      name: toRelationFieldName(rel.fromModel) + "s",
      type: rel.fromModel,
      isOptional: false,
      isList: true,
      attributes: Object.freeze([]),
    }),
  ];

  return Object.freeze({ ownerFields: Object.freeze(ownerFields), referenceFields: Object.freeze(referenceFields) });
}

export function buildManyToManyFields(rel: Readonly<RelationDefinition>): RelationFields {
  const ownerFields: FieldDefinition[] = [
    Object.freeze({
      name: toRelationFieldName(rel.toModel) + "s",
      type: rel.toModel,
      isOptional: false,
      isList: true,
      attributes: Object.freeze([]),
    }),
  ];

  const referenceFields: FieldDefinition[] = [
    Object.freeze({
      name: toRelationFieldName(rel.fromModel) + "s",
      type: rel.fromModel,
      isOptional: false,
      isList: true,
      attributes: Object.freeze([]),
    }),
  ];

  return Object.freeze({ ownerFields: Object.freeze(ownerFields), referenceFields: Object.freeze(referenceFields) });
}
