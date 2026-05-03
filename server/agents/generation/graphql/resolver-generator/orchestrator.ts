import { applyAuthGuards } from './agents/auth-guard.agent.js';
import { applyDataLoaders } from './agents/dataloader.agent.js';
import { applyErrorHandling } from './agents/error-handler.agent.js';
import { generateFieldResolvers } from './agents/field-resolver.agent.js';
import { generateMutationResolvers } from './agents/mutation-resolver.agent.js';
import { generateQueryResolvers } from './agents/query-resolver.agent.js';
import { generateSubscriptionResolvers } from './agents/subscription-resolver.agent.js';
import { createInitialResolverGeneratorState, patchResolverGeneratorState } from './state.js';
import type { ResolverConfig, ResolverGeneratorOutput, ResolverMap } from './types.js';
import { logEvent } from './utils/logger.util.js';
import { mapResolverOutput } from './utils/response-mapper.util.js';

export const generateResolvers = async (
  config: ResolverConfig,
): Promise<Readonly<ResolverGeneratorOutput>> => {
  let state = createInitialResolverGeneratorState(config.schema);
  state = patchResolverGeneratorState(state, {
    status: 'GENERATING',
    logs: [...state.logs, logEvent('orchestrator', 'Resolver generation started')],
  });

  try {
    const queryResolvers = generateQueryResolvers(config);
    state = patchResolverGeneratorState(state, {
      logs: [...state.logs, logEvent('query-resolver', `Generated ${Object.keys(queryResolvers).length} query resolvers`)],
    });

    const mutationResolvers = generateMutationResolvers(config);
    state = patchResolverGeneratorState(state, {
      logs: [
        ...state.logs,
        logEvent('mutation-resolver', `Generated ${Object.keys(mutationResolvers).length} mutation resolvers`),
      ],
    });

    const subscriptionResolvers = generateSubscriptionResolvers(config);
    state = patchResolverGeneratorState(state, {
      logs: [
        ...state.logs,
        logEvent(
          'subscription-resolver',
          `Generated ${Object.keys(subscriptionResolvers).length} subscription resolvers`,
        ),
      ],
    });

    const fieldResolvers = generateFieldResolvers(config);
    state = patchResolverGeneratorState(state, {
      logs: [...state.logs, logEvent('field-resolver', `Generated ${Object.keys(fieldResolvers).length} field resolver groups`)],
    });

    const assembledResolvers: ResolverMap = {
      ...(Object.keys(queryResolvers).length ? { Query: queryResolvers } : {}),
      ...(Object.keys(mutationResolvers).length ? { Mutation: mutationResolvers } : {}),
      ...(Object.keys(subscriptionResolvers).length ? { Subscription: subscriptionResolvers } : {}),
      ...fieldResolvers,
    };

    const guardedResolvers = applyAuthGuards(assembledResolvers, config);
    state = patchResolverGeneratorState(state, {
      logs: [...state.logs, logEvent('auth-guard', 'Applied auth guards')],
    });

    const loaderAwareResolvers = applyDataLoaders(guardedResolvers, config);
    state = patchResolverGeneratorState(state, {
      logs: [...state.logs, logEvent('dataloader', 'Applied dataloaders')],
    });

    const safeResolvers = applyErrorHandling(loaderAwareResolvers);
    state = patchResolverGeneratorState(state, {
      status: 'COMPLETE',
      resolvers: safeResolvers,
      logs: [...state.logs, logEvent('error-handler', 'Applied error normalization')],
    });

    return mapResolverOutput(true, state.resolvers, state.logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Resolver generation failed';

    state = patchResolverGeneratorState(state, {
      status: 'FAILED',
      errors: [...state.errors, message],
      logs: [...state.logs, logEvent('orchestrator', `Resolver generation failed: ${message}`)],
    });

    return mapResolverOutput(false, state.resolvers, state.logs, message);
  }
};

export const validateResolvers = (output: ResolverGeneratorOutput): boolean => {
  const hasRootResolver = Boolean(output.resolvers.Query || output.resolvers.Mutation || output.resolvers.Subscription);
  return output.success && hasRootResolver;
};
