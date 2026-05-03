import { generateTypes } from "./agents/type-generator.agent.js";
import { generateQueries } from "./agents/query-generator.agent.js";
import { generateMutations } from "./agents/mutation-generator.agent.js";
import { generateSubscriptions } from "./agents/subscription-generator.agent.js";
import { generateScalars } from "./agents/scalar-generator.agent.js";
import { generateInterfaces } from "./agents/interface-generator.agent.js";
import { generateDirectives } from "./agents/directive-generator.agent.js";
import { composeSchema } from "./agents/schema-composer.agent.js";
import { createLogger } from "./utils/logger.util.js";
import { validateSchemaParts } from "./utils/validation.util.js";
import type { SchemaConfig, SchemaOutput } from "./types.js";
import {
  addError,
  resetSchemaState,
  setLogs,
  setSchemaParts,
  setSchemaValue,
  updateSchemaStatus,
} from "./state.js";

export function validateSchema(config: SchemaConfig): { readonly valid: boolean; readonly errors: readonly string[] } {
  const typesResult = generateTypes(config);
  const queriesResult = generateQueries(config);
  const mutationsResult = generateMutations(config);
  const subscriptionsResult = generateSubscriptions(config);
  const scalarsResult = generateScalars(config);
  const interfacesResult = generateInterfaces(config);
  const directivesResult = generateDirectives(config);

  const schema = composeSchema({
    scalars: scalarsResult,
    interfaces: interfacesResult.sdl,
    directives: directivesResult.sdl,
    types: typesResult.sdl,
    query: queriesResult.sdl,
    mutation: mutationsResult.sdl,
    subscription: subscriptionsResult.sdl,
  });

  return validateSchemaParts({
    types: typesResult.definitions,
    queries: queriesResult.definitions,
    mutations: mutationsResult.definitions,
    subscriptions: subscriptionsResult.definitions,
    schema,
  });
}

export function generateSchema(config: SchemaConfig): SchemaOutput {
  const logger = createLogger();
  resetSchemaState();
  updateSchemaStatus("GENERATING");

  try {
    logger.info("Starting schema generation.");

    logger.info("Generating object types.");
    const typesResult = generateTypes(config);

    logger.info("Generating query root fields.");
    const queriesResult = generateQueries(config);

    logger.info("Generating mutation root fields.");
    const mutationsResult = generateMutations(config);

    logger.info("Generating subscription root fields.");
    const subscriptionsResult = generateSubscriptions(config);

    logger.info("Generating scalars, interfaces, and directives.");
    const scalarsResult = generateScalars(config);
    const interfacesResult = generateInterfaces(config);
    const directivesResult = generateDirectives(config);

    logger.info("Composing full schema SDL.");
    const schema = composeSchema({
      scalars: scalarsResult,
      interfaces: interfacesResult.sdl,
      directives: directivesResult.sdl,
      types: typesResult.sdl,
      query: queriesResult.sdl,
      mutation: mutationsResult.sdl,
      subscription: subscriptionsResult.sdl,
    });

    logger.info("Validating generated schema.");
    const validation = validateSchemaParts({
      types: typesResult.definitions,
      queries: queriesResult.definitions,
      mutations: mutationsResult.definitions,
      subscriptions: subscriptionsResult.definitions,
      schema,
    });

    setSchemaParts({
      types: typesResult.definitions,
      queries: queriesResult.definitions,
      mutations: mutationsResult.definitions,
      subscriptions: subscriptionsResult.definitions,
    });
    setSchemaValue(schema);

    if (!validation.valid) {
      for (const error of validation.errors) {
        addError(error);
      }
      updateSchemaStatus("FAILED");

      logger.info("Schema generation failed validation.");
      setLogs(logger.history());

      return Object.freeze({
        success: false,
        schema,
        types: typesResult.definitions,
        queries: queriesResult.definitions,
        mutations: mutationsResult.definitions,
        subscriptions: subscriptionsResult.definitions,
        logs: logger.history(),
        error: validation.errors.join("; "),
      });
    }

    updateSchemaStatus("COMPLETE");
    logger.info("Schema generation completed successfully.");
    setLogs(logger.history());

    return Object.freeze({
      success: true,
      schema,
      types: typesResult.definitions,
      queries: queriesResult.definitions,
      mutations: mutationsResult.definitions,
      subscriptions: subscriptionsResult.definitions,
      logs: logger.history(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown schema generation failure.";
    addError(message);
    updateSchemaStatus("FAILED");
    logger.info("Schema generation failed unexpectedly.");
    setLogs(logger.history());

    return Object.freeze({
      success: false,
      schema: "",
      types: Object.freeze([]),
      queries: Object.freeze([]),
      mutations: Object.freeze([]),
      subscriptions: Object.freeze([]),
      logs: logger.history(),
      error: message,
    });
  }
}
