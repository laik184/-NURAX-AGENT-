import { transitionState } from "../state.js";
import type { AgentResult, GeneratorConfig, SchemaGeneratorState } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { formatGenerator } from "../utils/schema-formatter.util.js";

const SOURCE = "generator-config";

const DEFAULTS: Readonly<GeneratorConfig> = Object.freeze({
  provider: "prisma-client-js",
});

export interface GeneratorInput {
  readonly config?: Partial<GeneratorConfig>;
  readonly state: Readonly<SchemaGeneratorState>;
}

export function buildGeneratorConfig(
  input: GeneratorInput,
): Readonly<AgentResult & { block?: string }> {
  const { config = {}, state } = input;

  const resolved: GeneratorConfig = Object.freeze({
    provider: config.provider ?? DEFAULTS.provider,
    ...(config.output ? { output: config.output } : {}),
    ...(config.previewFeatures?.length ? { previewFeatures: Object.freeze([...config.previewFeatures]) } : {}),
    ...(config.binaryTargets?.length ? { binaryTargets: Object.freeze([...config.binaryTargets]) } : {}),
  });

  const block = formatGenerator(resolved);
  const log = buildLog(SOURCE, `Generator configured: provider=${resolved.provider}`);

  return {
    nextState: transitionState(state, {
      generator: resolved,
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: block, logs: Object.freeze([log]) }),
    block,
  };
}
