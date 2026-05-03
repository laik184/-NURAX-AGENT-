import type { HvpContract } from "../types.js";

export function generateAuthNavigator(authEnabled: boolean, initialRoute: string): HvpContract {
  const authScreens = Object.freeze(["Login", "Register"]);

  return Object.freeze({
    success: true,
    logs: Object.freeze([`Auth navigator generated with authEnabled=${authEnabled}.`]),
    data: Object.freeze({
      type: "auth",
      authEnabled,
      unauthenticated: authScreens,
      authenticatedInitialRoute: initialRoute,
      guard: authEnabled ? "RequireAuth" : "PublicOnly",
      switchLogic: authEnabled
        ? "isAuthenticated ? <AppNavigator /> : <AuthNavigator />"
        : "<AppNavigator />",
      protectedRoutes: authEnabled ? "All app routes require session token." : "No protected routes.",
    }),
  });
}
