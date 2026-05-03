import { applyFrameworkAdapter } from "./agents/framework-adapter.agent";
import { mapHttpMethod } from "./agents/http-method-mapper.agent";
import { buildRoutes } from "./agents/route-builder.agent";
import { validateRoutes } from "./agents/route-validator.agent";
import { writeRoutes, type FileWriterPort } from "./agents/route-writer.agent";
import {
  createRouteGeneratorState,
  withError,
  withGeneratedFiles,
  withLog,
  withRoutes,
  withStatus,
} from "./state";
import type { RouteConfig, RouteResult } from "./types";

export interface GenerateRoutesOptions {
  fileWriter?: FileWriterPort;
}

export const generateRoutes = async (
  config: RouteConfig,
  options: GenerateRoutesOptions = {},
): Promise<RouteResult> => {
  let state = createRouteGeneratorState(config.framework);

  try {
    state = withStatus(state, "RUNNING");
    state = withLog(state, "Route generation started");

    const methods = config.endpoints.map((endpoint) => mapHttpMethod(endpoint.method));
    state = withLog(state, "HTTP methods mapped");

    const builtRoutes = buildRoutes(config.endpoints, methods);
    state = withLog(state, "Route structures built");

    const frameworkRoutes = applyFrameworkAdapter(config.framework, builtRoutes);
    state = withRoutes(state, frameworkRoutes);
    state = withLog(state, `Framework adapter applied for ${config.framework}`);

    const validation = validateRoutes(frameworkRoutes);
    if (!validation.valid) {
      const validationError = validation.errors.join("; ");
      state = withError(state, validationError);
      throw new Error(validationError);
    }
    state = withLog(state, "Route validation succeeded");

    const writeResult = await writeRoutes(
      config.framework,
      frameworkRoutes,
      options.fileWriter,
      config.outputDir,
    );

    state = withGeneratedFiles(state, writeResult.files);
    state = withStatus(state, "SUCCESS");
    state = withLog(state, "Route writing completed");

    return Object.freeze({
      success: true,
      files: state.generatedFiles,
      routes: state.routes,
      logs: state.logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown route generation failure";
    state = withStatus(state, "FAILED");
    state = withError(state, message);
    state = withLog(state, "Route generation failed");

    return Object.freeze({
      success: false,
      files: state.generatedFiles,
      routes: state.routes,
      logs: state.logs,
      error: message,
    });
  }
};
