import { buildControllerSource } from "./agents/controller-builder.agent.js";
import { withErrorHandling } from "./agents/error-handler.agent.js";
import { parseRequests } from "./agents/request-parser.agent.js";
import { buildMethodResponse } from "./agents/response-builder.agent.js";
import { mapRoutes } from "./agents/route-mapper.agent.js";
import { buildValidationCode, injectValidations } from "./agents/validation-injector.agent.js";
import { ControllerGeneratorStateStore, createInitialState } from "./state.js";
import type { ControllerConfig, GeneratedController } from "./types.js";
import { buildControllerFileName } from "./utils/naming.util.js";

export function generateController(config: ControllerConfig): GeneratedController {
  const stateStore = new ControllerGeneratorStateStore(createInitialState(config.controllerName));

  try {
    stateStore.transition({ status: "GENERATING", log: "Starting controller generation." });

    const routes = mapRoutes(config);
    stateStore.transition({ routes, log: `Mapped ${routes.length} route(s).` });

    const parsedMethods = parseRequests(routes);
    stateStore.transition({ methods: parsedMethods, log: `Parsed ${parsedMethods.length} request definition(s).` });

    const methods = injectValidations(parsedMethods, config.validations ?? []);
    stateStore.transition({ methods, validations: config.validations ?? [], log: "Injected validation bindings." });

    const validationCode = buildValidationCode(config.validations ?? []);

    const methodBodies = Object.fromEntries(
      methods.map((method) => {
        const responseCode = buildMethodResponse(method);
        const safeBody = withErrorHandling(responseCode);
        return [method.name, safeBody];
      }),
    );

    const builtController = buildControllerSource(config, methods, methodBodies, validationCode);
    stateStore.transition({ status: "DONE", log: "Controller source assembled." });

    const snapshot = stateStore.snapshot();
    const output: GeneratedController = {
      success: true,
      fileName: buildControllerFileName(config.controllerName),
      code: builtController.code,
      logs: snapshot.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Controller generation failed.";
    stateStore.transition({ status: "FAILED", error: message, log: "Controller generation failed." });
    const snapshot = stateStore.snapshot();

    const output: GeneratedController = {
      success: false,
      fileName: buildControllerFileName(config.controllerName),
      code: "",
      logs: [...snapshot.logs, ...snapshot.errors],
    };

    return Object.freeze(output);
  }
}
