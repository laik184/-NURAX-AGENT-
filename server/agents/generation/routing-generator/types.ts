export type FrameworkType =
  | 'express'
  | 'fastify'
  | 'nestjs'
  | 'react-router'
  | 'nextjs'
  | 'vue-router'
  | 'unknown';

export interface Route {
  readonly filePath: string;
  readonly routePath: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly kind: 'backend' | 'frontend';
  readonly handlerName: string;
}

export interface DynamicRoute {
  readonly sourcePath: string;
  readonly routePath: string;
  readonly params: readonly string[];
  readonly queryParams: readonly string[];
}

export interface RouteConfig {
  readonly framework: FrameworkType;
  readonly routes: readonly Route[];
  readonly dynamicRoutes: readonly DynamicRoute[];
}

export interface RoutingResult {
  readonly success: boolean;
  readonly routesGenerated: number;
  readonly filesCreated: readonly string[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface RouteAnalyzerResult {
  readonly backendFiles: readonly string[];
  readonly frontendFiles: readonly string[];
  readonly frameworkHints: readonly FrameworkType[];
}

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface GenerateRoutesInput {
  readonly rootDir?: string;
  readonly outputDir?: string;
  readonly overwrite?: boolean;
}
