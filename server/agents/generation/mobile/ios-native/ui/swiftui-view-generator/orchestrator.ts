import { buildRootView as buildScreenView } from "./agents/view-builder.agent.js";
import { generateComponents } from "./agents/component-generator.agent.js";
import { generateFormSection } from "./agents/form-generator.agent.js";
import { generateLayout } from "./agents/layout-generator.agent.js";
import { generateListSection } from "./agents/list-generator.agent.js";
import { generateNavigation } from "./agents/navigation-generator.agent.js";
import { addError, addLog, createInitialState, updateState } from "./state.js";
import type { ScreenConfig, SwiftUIViewOutput } from "./types.js";
import { formatViewCode } from "./utils/code-formatter.util.js";
import { appendLog } from "./utils/logger.util.js";
import { ensureViewName } from "./utils/naming.util.js";
import { buildViewStruct } from "./utils/swift-syntax.util.js";

export function validateView(config: Readonly<ScreenConfig>): boolean {
  return (
    Boolean(config) &&
    typeof config.screenName === "string" &&
    config.screenName.length > 0 &&
    Boolean(config.layout?.type) &&
    Array.isArray(config.components)
  );
}

export function formatView(code: string): string {
  return formatViewCode(code);
}

export function generateSwiftUIView(config: Readonly<ScreenConfig>): SwiftUIViewOutput {
  let state = createInitialState(config?.screenName ?? "GeneratedScreen");

  try {
    if (!validateView(config)) {
      throw new Error("Invalid screen config.");
    }

    const screenName = ensureViewName(config.screenName);
    state = updateState(state, {
      screenName,
      components: config.components,
      layout: config.layout,
      navigation: config.navigation ?? { useNavigationStack: true, useNavigationLinks: true },
      status: "GENERATING",
    });

    state = addLog(state, "Input accepted and state initialized.");

    const componentSection = generateComponents(config.components).join("\n");
    state = addLog(state, "Components generated.");

    const listSection = generateListSection(config.list);
    state = addLog(state, "List section generated.");

    const formSection = generateFormSection(config.form);
    state = addLog(state, "Form section generated.");

    const layoutSection = generateLayout(config.layout, [componentSection, listSection, formSection].filter(Boolean).join("\n"));
    state = addLog(state, "Layout section generated.");

    const navigatedSection = generateNavigation(layoutSection, config.navigation);
    state = addLog(state, "Navigation section generated.");

    const body = buildScreenView(screenName, "", navigatedSection);
    const code = formatView(buildViewStruct(screenName, body));

    const finalLogs = appendLog(state.logs, "SwiftUI view generated successfully.");
    const output = Object.freeze({
      success: true,
      code,
      components: Object.freeze(config.components.map((component) => component.id)),
      logs: finalLogs,
    });

    state = updateState(state, { status: "DONE", generatedCode: code, logs: finalLogs });
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SwiftUI generation error.";
    state = addError(state, message);
    const logs = appendLog(state.logs, `Failed to generate SwiftUI: ${message}`);

    return Object.freeze({
      success: false,
      code: "",
      components: Object.freeze([]),
      logs,
      error: message,
    });
  }
}
