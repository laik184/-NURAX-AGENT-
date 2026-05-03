export type NavigationStatus = "IDLE" | "BUILDING" | "READY" | "ERROR";

export type GuardCondition = "NONE" | "AUTH_REQUIRED" | "PERMISSION_REQUIRED";

export interface Route {
  readonly id: string;
  readonly screenId: string;
  readonly path: string;
  readonly args: readonly string[];
  readonly guard: GuardCondition;
}

export interface ScreenConfig {
  readonly id: string;
  readonly startDestination?: boolean;
  readonly path: string;
  readonly params?: readonly string[];
  readonly deepLinks?: readonly string[];
  readonly guard?: GuardCondition;
}

export interface NavDestination {
  readonly routeId: string;
  readonly path: string;
  readonly args: readonly string[];
  readonly deepLinks: readonly string[];
  readonly guard: GuardCondition;
}

export interface NavGraph {
  readonly startDestination: string;
  readonly destinations: readonly NavDestination[];
}

export interface DeepLinkConfig {
  readonly routeId: string;
  readonly uriPattern: string;
}

export interface NavigationResult {
  readonly success: boolean;
  readonly graph: NavGraph | null;
  readonly routes: readonly Route[];
  readonly deepLinks: readonly DeepLinkConfig[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface NavigationInput {
  readonly screens: readonly ScreenConfig[];
}

export interface NavigateRequest {
  readonly target: string;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
  readonly replaceTop?: boolean;
}
