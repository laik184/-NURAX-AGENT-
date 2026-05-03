export const JS_TO_MONGOOSE_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  string: "String",
  String: "String",
  number: "Number",
  Number: "Number",
  int: "Number",
  integer: "Number",
  float: "Number",
  double: "Number",
  boolean: "Boolean",
  Boolean: "Boolean",
  bool: "Boolean",
  date: "Date",
  Date: "Date",
  datetime: "Date",
  timestamp: "Date",
  buffer: "Buffer",
  Buffer: "Buffer",
  mixed: "Schema.Types.Mixed",
  Mixed: "Schema.Types.Mixed",
  any: "Schema.Types.Mixed",
  objectid: "Schema.Types.ObjectId",
  ObjectId: "Schema.Types.ObjectId",
  id: "Schema.Types.ObjectId",
  decimal: "Schema.Types.Decimal128",
  Decimal128: "Schema.Types.Decimal128",
  decimal128: "Schema.Types.Decimal128",
  map: "Map",
  Map: "Map",
  uuid: "Schema.Types.UUID",
  UUID: "Schema.Types.UUID",
  object: "Schema.Types.Mixed",
  json: "Schema.Types.Mixed",
});

export function mapToMongooseType(inputType: string): string {
  return JS_TO_MONGOOSE_TYPE_MAP[inputType] ?? "String";
}

export function isReferenceType(type: string): boolean {
  return ["objectid", "ObjectId", "id", "ref"].includes(type);
}

export function isScalarType(type: string): boolean {
  return Object.keys(JS_TO_MONGOOSE_TYPE_MAP).includes(type);
}
