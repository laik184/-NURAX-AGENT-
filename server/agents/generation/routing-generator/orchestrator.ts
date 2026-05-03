import { analyzeProjectStructure } from './agents/route-analyzer.agent.js';
import { generateBackendRouter } from './agents/backend-router.agent.js';
import { extractDynamicRoutes } from './agents/dynamic-route.agent.js';
import { generateFrontendRouter } from './agents/frontend-router.agent.js';
import { mapRoutes } from './agents/route-mapper.agent.js';
import { validateRoutes as validateMappedRoutes } from './agents/validation.agent.js';
import { createInitialState, transitionState, type RoutingGeneratorState } from './state.js';
import type { FrameworkType, GenerateRoutesInput, Route, RoutingResult } from './types.js';
import { writeGeneratedFiles } from './utils/file-writer.util.js';
import { createLogger } from './utils/logger.util.js';

const detectFramework = (hints: readonly FrameworkType[], routes: readonly Route[]): FrameworkType => {
  if (hints.length > 0) {
    return hints[0];
  }

  const hasBackend = routes.some((route) => route.kind === 'backend');
  const hasFrontend = routes.some((route) => route.kind === 'frontend');

  if (hasBackend && !hasFrontend) return 'express';
  if (hasFrontend && !hasBackend) return 'react-router';
  if (hasBackend && hasFrontend) return 'express';

  return 'unknown';
};

export class RoutingGeneratorOrchestrator {
  async generate(input: GenerateRoutesInput = {}): Promise<RoutingResult> {
    const logger = createLogger('routing-generator.orchestrator');
    const rootDir = input.rootDir ?? process.cwd();
    const outputDir = input.outputDir ?? 'generated-routing';

    let state = createInitialState();
    state = this.updateState(state, {
      status: 'GENERATING',
      logs: [...state.logs, logger.info(`Started routing generation for ${rootDir}`)],
    });

    try {
      const analyzed = await analyzeProjectStructure(rootDir);
      state = this.updateState(state, {
        logs: [
          ...state.logs,
          logger.info(
            `Analyzed structure. backendFiles=${analyzed.backendFiles.length}, frontendFiles=${analyzed.frontendFiles.length}`,
          ),
        ],
      });

      const routes = mapRoutes(rootDir, analyzed);
      state = this.updateState(state, {
        routes,
        logs: [...state.logs, logger.info(`Mapped ${routes.length} unique routes.`)],
      });

      const detectedFramework = detectFramework(analyzed.frameworkHints, routes);
      state = this.updateState(state, {
        detectedFramework,
        logs: [...state.logs, logger.info(`Detected framework: ${detectedFramework}`)],
      });

      const dynamicRoutes = extractDynamicRoutes(routes);
      state = this.updateState(state, {
        dynamicRoutes,
        logs: [...state.logs, logger.info(`Identified ${dynamicRoutes.length} dynamic routes.`)],
      });

      const backendFile = generateBackendRouter(detectedFramework, routes, outputDir);
      const frontendFile = generateFrontendRouter(detectedFramework, routes, outputDir);
      const generatedFiles = [backendFile, frontendFile].filter((value): value is NonNullable<typeof value> => value !== null);

      const validation = validateMappedRoutes(routes, dynamicRoutes);
      state = this.updateState(state, {
        logs: [...state.logs, ...validation.logs],
      });

      if (!validation.valid) {
        state = this.updateState(state, {
          status: 'FAILED',
          errors: [...state.errors, validation.error ?? 'Routing validation failed'],
          logs: [...state.logs, logger.error('Validation failed.')],
        });

        return Object.freeze({
          success: false,
          routesGenerated: routes.length,
          filesCreated: Object.freeze([]),
          logs: state.logs,
          error: state.errors[0] ?? 'Routing validation failed',
        });
      }

      const writeResult = await writeGeneratedFiles(rootDir, generatedFiles, input.overwrite ?? false);
      state = this.updateState(state, {
        status: 'SUCCESS',
        logs: [
          ...state.logs,
          logger.info(`Created ${writeResult.created.length} files, skipped ${writeResult.skipped.length} files.`),
        ],
      });

      const output: RoutingResult = {
        success: true,
        routesGenerated: routes.length,
        filesCreated: writeResult.created,
        logs: state.logs,
      };

      return Object.freeze(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown routing generator error';
      state = this.updateState(state, {
        status: 'FAILED',
        errors: [...state.errors, message],
        logs: [...state.logs, logger.error(message)],
      });

      const failed: RoutingResult = {
        success: false,
        routesGenerated: state.routes.length,
        filesCreated: Object.freeze([]),
        logs: state.logs,
        error: message,
      };

      return Object.freeze(failed);
    }
  }

  validate(routes: readonly Route[]): Readonly<{ valid: boolean; logs: readonly string[]; error?: string }> {
    const dynamicRoutes = extractDynamicRoutes(routes);
    return validateMappedRoutes(routes, dynamicRoutes);
  }

  private updateState(
    current: Readonly<RoutingGeneratorState>,
    patch: Partial<RoutingGeneratorState>,
  ): Readonly<RoutingGeneratorState> {
    return transitionState(current, patch);
  }
}
