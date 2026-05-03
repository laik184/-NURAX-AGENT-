import { codeWriterAgent } from './agents/code-writer.agent.js';
import { dependencyInjectorAgent } from './agents/dependency-injector.agent.js';
import { errorHandlerAgent } from './agents/error-handler.agent.js';
import { methodGeneratorAgent } from './agents/method-generator.agent.js';
import { servicePlannerAgent } from './agents/service-planner.agent.js';
import { validationInjectorAgent } from './agents/validation-injector.agent.js';
import { createInitialState, ServiceGeneratorStateManager } from './state.js';
import type { ServiceConfig, ServiceGenerationOutput } from './types.js';

export const generateService = (config: ServiceConfig): Readonly<ServiceGenerationOutput> => {
  let state = createInitialState(config.entityName);

  try {
    state = ServiceGeneratorStateManager.updateStatus(state, 'GENERATING', 'Service generation started');

    const plannedMethods = servicePlannerAgent.plan(config);
    state = ServiceGeneratorStateManager.setMethods(state, plannedMethods);

    const resolvedDependencies = config.dependencies ?? [];
    state = ServiceGeneratorStateManager.setDependencies(state, resolvedDependencies);

    const methodModels = methodGeneratorAgent.generate(plannedMethods);
    const validatedMethods = validationInjectorAgent.inject(
      methodModels,
      config.validation,
      config.strictValidation ?? true,
    );

    const injectionModel = dependencyInjectorAgent.inject(config.entityName, resolvedDependencies);
    const resilientMethods = errorHandlerAgent.wrap(validatedMethods);

    const generatedService = codeWriterAgent.write(config, resilientMethods, plannedMethods, injectionModel);

    state = ServiceGeneratorStateManager.updateStatus(state, 'SUCCESS', 'Service generation completed');

    const output: ServiceGenerationOutput = {
      success: true,
      code: generatedService.code,
      fileName: generatedService.fileName,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation failure';
    state = ServiceGeneratorStateManager.addError(state, message);

    const output: ServiceGenerationOutput = {
      success: false,
      code: '',
      fileName: '',
      logs: state.logs,
      error: message,
    };

    return Object.freeze(output);
  }
};
