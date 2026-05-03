export type NavigationInput = {
  screens: readonly string[];
  authEnabled?: boolean;
  deepLinking?: boolean;
};

export type NavigationOutput = {
  stack: any;
  tabs?: any;
  drawer?: any;
  deepLinks?: any;
};

export type HvpContract = {
  success: boolean;
  logs: readonly string[];
  error?: string;
  data?: any;
};

export type NormalizedNavigationInput = {
  screens: readonly string[];
  authEnabled: boolean;
  deepLinking: boolean;
};

export type NavigationState = {
  routes: string[];
  authRequired: boolean;
  initialRoute: string;
};

export type ScreenMapping = {
  route: string;
  component: string;
  title: string;
};

export type NavigationConfigInput = {
  stack: any;
  tabs: any;
  drawer: any;
  auth: any;
  deepLinks?: any;
};
