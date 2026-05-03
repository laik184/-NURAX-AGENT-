import { transitionState } from "../state.js";
import type { AgentResult, DatasourceConfig, SchemaGeneratorState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { formatDatasource } from "../utils/schema-formatter.util.js";

const SOURCE = "datasource-config";

const DEFAULTS: Readonly<DatasourceConfig> = Object.freeze({
  provider: "postgresql",
  url: "DATABASE_URL",
});

export interface DatasourceInput {
  readonly config?: Partial<DatasourceConfig>;
  readonly state: Readonly<SchemaGeneratorState>;
}

export function buildDatasourceConfig(
  input: DatasourceInput,
): Readonly<AgentResult & { block?: string }> {
  const { config = {}, state } = input;

  const resolved: DatasourceConfig = Object.freeze({
    provider: config.provider ?? DEFAULTS.provider,
    url: config.url ?? DEFAULTS.url,
    ...(config.shadowDatabaseUrl ? { shadowDatabaseUrl: config.shadowDatabaseUrl } : {}),
    ...(config.relationMode ? { relationMode: config.relationMode } : {}),
  });

  const validProviders = ["postgresql", "mysql", "sqlite", "sqlserver", "mongodb"];
  if (!validProviders.includes(resolved.provider)) {
    const msg = `Unsupported database provider: ${resolved.provider}`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, schema: "", logs: Object.freeze([buildLog(SOURCE, msg)]), error: "invalid_provider" }),
    };
  }

  const block = formatDatasource(resolved);
  const log = buildLog(SOURCE, `Datasource configured: provider=${resolved.provider} url=env("${resolved.url}")`);

  return {
    nextState: transitionState(state, {
      datasource: resolved,
      appendLog: log,
    }),
    output: Object.freeze({ success: true, schema: block, logs: Object.freeze([log]) }),
    block,
  };
}
