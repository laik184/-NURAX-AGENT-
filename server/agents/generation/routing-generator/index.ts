import { RoutingGeneratorOrchestrator } from './orchestrator.js';
import type { GenerateRoutesInput, Route, RoutingResult, ValidationResult } from './types.js';

const orchestrator = new RoutingGeneratorOrchestrator();

export const generateRoutes = async (input: GenerateRoutesInput = {}): Promise<RoutingResult> => orchestrator.generate(input);

export const validateRoutes = (routes: readonly Route[]): Readonly<ValidationResult> => orchestrator.validate(routes);

export type { DynamicRoute, FrameworkType, GenerateRoutesInput, Route, RouteConfig, RouteAnalyzerResult, RoutingResult } from './types.js';
