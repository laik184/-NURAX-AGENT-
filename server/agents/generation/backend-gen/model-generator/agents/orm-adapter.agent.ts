import type { ModelBuildArtifact, SupportedOrm } from "../types.js";
import { formatCode } from "../utils/code-formatter.util.js";
import { loadTemplate } from "../utils/template-loader.util.js";
import { mapFieldType } from "../utils/type-mapper.util.js";

function renderPrisma(artifact: ModelBuildArtifact): string {
  const lines = artifact.fields.map((field) => {
    const ormType = mapFieldType(field.type, "prisma");
    const attrs = [
      field.primary ? "@id" : "",
      field.unique ? "@unique" : "",
      field.required ? "" : "?",
    ].filter(Boolean);
    return `  ${field.name} ${ormType}${attrs.length > 0 ? ` ${attrs.join(" ")}` : ""}`;
  });
  return [`model ${artifact.modelName} {`, ...lines, "}"].join("\n");
}

function renderTypeOrm(artifact: ModelBuildArtifact): string {
  const lines = artifact.fields.map((field) => {
    const ormType = mapFieldType(field.type, "typeorm");
    const decorator = field.primary ? "@PrimaryGeneratedColumn('uuid')" : `@Column({ type: '${ormType}' })`;
    return `  ${decorator}\n  ${field.name}: ${field.type === "date" ? "Date" : "string"};`;
  });
  return [
    'import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";',
    "",
    `@Entity({ name: \"${artifact.modelName.toLowerCase()}\" })`,
    `export class ${artifact.modelName} {`,
    ...lines,
    "}",
  ].join("\n");
}

function renderSequelize(artifact: ModelBuildArtifact): string {
  return artifact.fields
    .map((field) => {
      const ormType = mapFieldType(field.type, "sequelize");
      return `  ${field.name}: { type: ${ormType}, allowNull: ${field.required ? "false" : "true"}, unique: ${field.unique ? "true" : "false"}, primaryKey: ${field.primary ? "true" : "false"} },`;
    })
    .join("\n");
}

function renderMongoose(artifact: ModelBuildArtifact): string {
  return artifact.fields
    .map((field) => {
      const ormType = mapFieldType(field.type, "mongoose");
      return `  ${field.name}: { type: ${ormType}, required: ${field.required ? "true" : "false"}, unique: ${field.unique ? "true" : "false"} },`;
    })
    .join("\n");
}

export function adaptToOrm(artifact: ModelBuildArtifact, orm: SupportedOrm): string {
  const template = loadTemplate(orm);

  const baseCode =
    orm === "prisma"
      ? renderPrisma(artifact)
      : orm === "typeorm"
        ? renderTypeOrm(artifact)
        : orm === "sequelize"
          ? renderSequelize(artifact)
          : renderMongoose(artifact);

  return formatCode(template(baseCode, artifact.modelName));
}
