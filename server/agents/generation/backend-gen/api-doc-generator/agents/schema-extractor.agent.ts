import ts from "typescript";

import type { SchemaFieldMeta, SchemaMeta } from "../types.js";
import type { ParsedSource } from "../utils/ast-parser.util.js";
import { mapTypeToOpenApi } from "../utils/type-mapper.util.js";

function buildField(name: string, typeText: string, required: boolean): SchemaFieldMeta {
  return Object.freeze({
    name,
    required,
    rawType: typeText,
    type: mapTypeToOpenApi(typeText).type,
  });
}

function extractFieldsFromTypeLiteral(node: ts.TypeLiteralNode): readonly SchemaFieldMeta[] {
  const fields: SchemaFieldMeta[] = [];
  for (const member of node.members) {
    if (!ts.isPropertySignature(member) || !member.type || !member.name) {
      continue;
    }

    fields.push(buildField(member.name.getText(), member.type.getText(), !member.questionToken));
  }
  return Object.freeze(fields);
}

export function extractSchemas(parsedSources: readonly ParsedSource[]): readonly SchemaMeta[] {
  const schemas: SchemaMeta[] = [];

  for (const parsed of parsedSources) {
    const visit = (node: ts.Node): void => {
      if (ts.isInterfaceDeclaration(node)) {
        const fields: SchemaFieldMeta[] = node.members
          .filter((member): member is ts.PropertySignature => ts.isPropertySignature(member) && Boolean(member.type))
          .map((member) => buildField(member.name.getText(), member.type!.getText(), !member.questionToken));

        schemas.push(
          Object.freeze({
            name: node.name.getText(),
            sourceFile: parsed.filePath,
            kind: "interface",
            fields: Object.freeze(fields),
          }),
        );
      }

      if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
        schemas.push(
          Object.freeze({
            name: node.name.getText(),
            sourceFile: parsed.filePath,
            kind: "type",
            fields: extractFieldsFromTypeLiteral(node.type),
          }),
        );
      }

      if (ts.isClassDeclaration(node) && node.name) {
        const fields: SchemaFieldMeta[] = node.members
          .filter((member): member is ts.PropertyDeclaration => ts.isPropertyDeclaration(member) && Boolean(member.type) && Boolean(member.name))
          .map((member) => buildField(member.name.getText(), member.type!.getText(), !member.questionToken));

        if (fields.length > 0) {
          schemas.push(
            Object.freeze({
              name: node.name.getText(),
              sourceFile: parsed.filePath,
              kind: "class",
              fields: Object.freeze(fields),
            }),
          );
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(parsed.sourceFile);
  }

  return Object.freeze(schemas);
}
