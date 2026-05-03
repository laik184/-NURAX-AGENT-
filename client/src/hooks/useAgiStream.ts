
import { useEffect, useState } from 'react';

export function useAgiStream() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [...prev.slice(-200), data]);
    };
    return () => es.close();
  }, []);

  return events;
}
