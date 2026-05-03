
export function connectSSE(onEvent: (data:any)=>void) {
  const es = new EventSource('/events');
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {}
  };
  return () => es.close();
}
