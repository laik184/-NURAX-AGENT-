import { buildIconComponent } from "./agents/icon-builder.agent.js";
import { buildImageComponent } from "./agents/image-builder.agent.js";
import { buildInputComponent } from "./agents/input-builder.agent.js";
import { buildListComponent } from "./agents/list-builder.agent.js";
import { buildModalComponent } from "./agents/modal-builder.agent.js";
import { buildTextComponent } from "./agents/text-builder.agent.js";
import { buildTouchableComponent } from "./agents/touchable-builder.agent.js";
import { buildViewComponent } from "./agents/view-builder.agent.js";
import { appendLog, createInitialState, withProcessedProps } from "./state.js";
import type { ComponentOutput, ComponentRequest } from "./types.js";
import { normalizeComponentProps } from "./utils/props-normalizer.util.js";

type Builder = (props: Readonly<Record<string, unknown>>) => string;

const COMPONENT_BUILDERS: Readonly<Record<ComponentRequest["type"], Builder>> = Object.freeze({
  view: buildViewComponent,
  text: buildTextComponent,
  button: buildTouchableComponent,
  list: buildListComponent,
  input: buildInputComponent,
  image: buildImageComponent,
  modal: buildModalComponent,
  icon: buildIconComponent,
});

function validateRequest(request: Readonly<ComponentRequest>): void {
  if (!request || typeof request !== "object") {
    throw new Error("Invalid component request payload.");
  }

  if (!request.type || !(request.type in COMPONENT_BUILDERS)) {
    throw new Error(`Unsupported component type: ${String(request.type)}`);
  }
}

export function generateReactNativeComponent(request: Readonly<ComponentRequest>): ComponentOutput {
  let state = createInitialState(request?.type ?? "unknown");

  try {
    validateRequest(request);
    state = appendLog(state, `Validated request for ${request.type}`);

    const normalizedProps = normalizeComponentProps(request);
    state = withProcessedProps(state, normalizedProps);
    state = appendLog(state, "Normalized incoming props");

    const builder = COMPONENT_BUILDERS[request.type];
    state = appendLog(state, `Routed request to ${request.type} builder`);

    const code = builder(state.processedProps);
    state = appendLog(state, "Generated component JSX output");

    return Object.freeze({
      success: true,
      code,
      logs: state.logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown component generation error";
    state = appendLog(state, `Generation failed: ${message}`);

    return Object.freeze({
      success: false,
      code: "",
      logs: state.logs,
      error: message,
    });
  }
}
