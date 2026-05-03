import type { GraphQLField, SchemaConfig, SubscriptionDefinition } from "../types.js";
import { buildFieldSDL } from "../utils/sdl-builder.util.js";
import { toFieldName } from "../utils/naming.util.js";

export function generateSubscriptions(config: SchemaConfig): {
  readonly definitions: readonly SubscriptionDefinition[];
  readonly sdl: string;
} {
  const definitions = (config.subscriptions ?? []).map((subscription) => Object.freeze({
    ...subscription,
    name: toFieldName(subscription.name),
  }));

  const fields: GraphQLField[] = definitions.map((subscription) => ({
    name: subscription.name,
    type: subscription.returnType,
    args: subscription.args,
    description: subscription.description,
  }));

  const fieldSDL = fields.map((field) => buildFieldSDL(field));
  const sdl = `type Subscription {\n${fieldSDL.join("\n")}\n}`;

  return Object.freeze({ definitions: Object.freeze(definitions), sdl });
}
