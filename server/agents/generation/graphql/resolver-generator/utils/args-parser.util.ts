interface ParsedSchema {
  queries: string[];
  mutations: string[];
  subscriptions: string[];
  fields: Record<string, string[]>;
}

const DEFAULT_PARSED_SCHEMA: ParsedSchema = {
  queries: [],
  mutations: [],
  subscriptions: [],
  fields: {},
};

export const parseSchemaInput = (schema: string | Record<string, unknown>): ParsedSchema => {
  if (typeof schema === 'string') {
    return parseSdl(schema);
  }

  return parseObjectSchema(schema);
};

const parseObjectSchema = (schema: Record<string, unknown>): ParsedSchema => {
  const queries = getStringArray(schema.query);
  const mutations = getStringArray(schema.mutation);
  const subscriptions = getStringArray(schema.subscription);

  const fieldsInput = schema.fields;
  const fields: Record<string, string[]> = {};

  if (isRecord(fieldsInput)) {
    for (const [typeName, value] of Object.entries(fieldsInput)) {
      fields[typeName] = getStringArray(value);
    }
  }

  return {
    queries,
    mutations,
    subscriptions,
    fields,
  };
};

const parseSdl = (sdl: string): ParsedSchema => {
  const parsed: ParsedSchema = {
    ...DEFAULT_PARSED_SCHEMA,
    fields: {},
  };

  const typeBlockPattern = /type\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g;
  let match = typeBlockPattern.exec(sdl);

  while (match) {
    const [, typeName, block] = match;
    const fieldNames = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(':')[0]?.trim())
      .map((segment) => segment?.split('(')[0]?.trim() ?? '')
      .filter(Boolean);

    if (typeName === 'Query') {
      parsed.queries = fieldNames;
    } else if (typeName === 'Mutation') {
      parsed.mutations = fieldNames;
    } else if (typeName === 'Subscription') {
      parsed.subscriptions = fieldNames;
    } else {
      parsed.fields[typeName] = fieldNames;
    }

    match = typeBlockPattern.exec(sdl);
  }

  return parsed;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
};
