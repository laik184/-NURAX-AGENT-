// Re-export the shared event bus so all server/chat/* code
// imports from this local path while keeping a single singleton instance.
export * from "../../infrastructure/events/bus.ts";
