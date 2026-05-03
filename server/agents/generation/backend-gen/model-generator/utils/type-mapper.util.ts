import type { SupportedOrm } from "../types.js";

const ORM_TYPE_MAP: Record<SupportedOrm, Record<string, string>> = {
  prisma: {
    uuid: "String",
    string: "String",
    text: "String",
    int: "Int",
    float: "Float",
    boolean: "Boolean",
    date: "DateTime",
    json: "Json",
  },
  sequelize: {
    uuid: "DataTypes.UUID",
    string: "DataTypes.STRING",
    text: "DataTypes.TEXT",
    int: "DataTypes.INTEGER",
    float: "DataTypes.FLOAT",
    boolean: "DataTypes.BOOLEAN",
    date: "DataTypes.DATE",
    json: "DataTypes.JSON",
  },
  typeorm: {
    uuid: "uuid",
    string: "varchar",
    text: "text",
    int: "int",
    float: "float",
    boolean: "boolean",
    date: "timestamp",
    json: "json",
  },
  mongoose: {
    uuid: "String",
    string: "String",
    text: "String",
    int: "Number",
    float: "Number",
    boolean: "Boolean",
    date: "Date",
    json: "Schema.Types.Mixed",
  },
};

export function mapFieldType(type: string, orm: SupportedOrm): string {
  const normalized = type.trim().toLowerCase();
  return ORM_TYPE_MAP[orm][normalized] ?? ORM_TYPE_MAP[orm].string;
}
