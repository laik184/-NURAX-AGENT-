/**
 * useAgentUltraStream — stream agent events for a specific runId.
 *
 * Fixed:
 *  - Was connecting to /sse/agent (legacy double-write endpoint).
 *    Now uses /api/agent/stream (canonical, single-write).
 *  - Was using es.onmessage which never fires for named events.
 *    Now uses addEventListener('agent', ...) via openSSE().
 */

import { useEffect, useState } from "react";
import { openSSE } from "@/realtime/sse-utils";

export function useAgentUltraStream(runId?: string): unknown[] {
  const [events, setEvents] = useState<unknown[]>([]);

  useEffect(() => {
    if (!runId) return;

    const url = `/api/agent/stream?runId=${encodeURIComponent(runId)}`;

    const close = openSSE(url, {
      agent: (data) => {
        setEvents((prev) => [...prev, data]);
      },
      lifecycle: (data) => {
        setEvents((prev) => [...prev, data]);
      },
    });

    return close;
  }, [runId]);

  return events;
}
