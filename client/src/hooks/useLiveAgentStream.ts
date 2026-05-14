/**
 * useLiveAgentStream — subscribe to /api/agent/stream with typed named events.
 *
 * Fixed: removed double-listener pattern (onmessage + addEventListener).
 * Now uses ONLY named addEventListener for each handler key, matching the
 * server's `event: <name>` frames. onmessage is never set.
 */

import { useEffect, useRef } from "react";
import { openSSE, type SSEHandlers } from "@/realtime/sse-utils";

export function useLiveAgentStream(handlers: SSEHandlers): void {
  const handlersRef = useRef<SSEHandlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // Stable dispatch wrappers — delegate to latest handlers via ref,
    // so handler identity changes never force a reconnect.
    const stableHandlers: SSEHandlers = {};
    for (const key of Object.keys(handlers)) {
      stableHandlers[key] = (data) => {
        handlersRef.current[key]?.(data);
      };
    }

    const close = openSSE("/api/agent/stream", stableHandlers, () => {
      // suppress connection errors — backend may not be running
    });

    return close;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — reconnection handled via handlersRef
}
