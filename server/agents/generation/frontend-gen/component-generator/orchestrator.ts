import { planComponent } from "./agents/component-planner.agent.js";
import { buildPropsDefinition } from "./agents/props-builder.agent.js";
import { selectTemplate } from "./agents/template-selector.agent.js";
import { generateComponentFile } from "./agents/jsx-generator.agent.js";
import { generateStyleFile } from "./agents/style-generator.agent.js";
import { generateTestFile } from "./agents/test-generator.agent.js";
import { generateExportFile } from "./agents/export-builder.agent.js";
import { createScopedLogger } from "./utils/logger.util.js";
import {
  appendError,
  appendLog,
  createInitialState,
  withFiles,
  withProps,
  withStatus,
  withTemplate,
} from "./state.js";
import type { ComponentRequest, ComponentResult, FileWriterAgent, GeneratedFile } from "./types.js";

export async function generateComponent(
  request: Readonly<ComponentRequest>,
  fileWriterAgent?: Readonly<FileWriterAgent>,
): Promise<ComponentResult> {
  const logger = createScopedLogger("component-generator");
  let state = createInitialState(request.componentName);

  try {
    state = withStatus(state, "GENERATING");
    state = appendLog(state, logger.info(`Received generation request for ${request.componentName}`));

    const plan = planComponent(request);
    state = appendLog(state, logger.info(`Planned ${plan.framework} ${plan.variant} component in ${plan.directory}`));

    const propsDef = buildPropsDefinition(request);
    state = withProps(state, propsDef.props);
    state = appendLog(state, logger.info(`Built ${propsDef.props.length} prop definition(s)`));

    const template = selectTemplate(plan);
    state = withTemplate(state, plan.variant);
    state = appendLog(state, logger.info(`Selected ${plan.variant} template`));

    const files: GeneratedFile[] = [];

    files.push(generateComponentFile(plan, propsDef, template));

    const styleFile = generateStyleFile(plan);
    if (styleFile) files.push(styleFile);

    files.push(generateTestFile(plan));
    files.push(generateExportFile(plan));

    state = withFiles(state, files);
    state = appendLog(state, logger.info(`Prepared ${files.length} generated file(s)`));

    if (fileWriterAgent) {
      await fileWriterAgent.writeFiles(state.files);
      state = appendLog(state, logger.info("Delegated writing to file-writer.agent"));
    }

    state = withStatus(state, "SUCCESS");

    return Object.freeze({
      success: true,
      componentName: plan.normalizedName,
      files: state.files,
      logs: state.logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    state = withStatus(state, "FAILED");
    state = appendError(state, logger.error(message));

    const output: ComponentResult = {
      success: false,
      componentName: request.componentName,
      files: state.files,
      logs: Object.freeze([...state.logs, ...state.errors]),
      error: message,
    };

    return Object.freeze(output);
  }
}
