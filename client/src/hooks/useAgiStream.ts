/**
 * useAgiStream — consume the AGI catch-all stream (/api/stream).
 *
 * Fixed: was using es.onmessage which never fires for named events.
 * /api/stream sends everything under `event: agi` — must use addEventListener.
 */

import { useEffect, useState } from "react";
import { openSSE } from "@/realtime/sse-utils";

export function useAgiStream(): unknown[] {
  const [events, setEvents] = useState<unknown[]>([]);

  useEffect(() => {
    const close = openSSE("/api/stream", {
      agi: (data) => {
        setEvents((prev) => [...prev.slice(-200), data]);
      },
    });

    return close;
  }, []);

  return events;
}
