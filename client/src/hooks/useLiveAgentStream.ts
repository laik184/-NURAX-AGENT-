import { useEffect, useRef } from 'react';

type EventHandler = (data: any) => void;

export function useLiveAgentStream(handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const es = new EventSource('/api/agent/stream');
    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (handlersRef.current[data.type]) handlersRef.current[data.type](data);
      } catch (err) {
        // ignore
      }
    };
    es.onmessage = onMessage;
    const currentHandlers = handlersRef.current;
    Object.keys(currentHandlers).forEach(evt => {
      es.addEventListener(evt, (ev: MessageEvent) => {
        try {
          const d = JSON.parse(ev.data);
          handlersRef.current[evt](d);
        } catch(e) {}
      });
    });
    es.onerror = () => {
      // suppress connection errors for missing backend
    };
    return () => {
      es.close();
    };
  }, []);
}
