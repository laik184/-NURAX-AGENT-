import React, { useEffect, useState } from "react";

export default function LogsPanel() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const buildId = "latest";
    const es = new EventSource(`/api/builds/${buildId}/logs`);

    es.onmessage = (e) => {
      setLogs(prev => [...prev, e.data]);
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, padding: 8, background: "#0b0b0b", color: "#ddd", height: "100%", overflow: "auto" }}>
      <h3 style={{ color: "#9ca3af", marginBottom: 8 }}>Live Logs</h3>
      {logs.length === 0 && <div style={{ color: "#6b7280" }}>No logs yet...</div>}
      {logs.map((line, idx) => (
        <div key={idx} style={{ padding: "2px 0", borderBottom: "1px solid #1f2937" }}>{line}</div>
      ))}
    </div>
  );
}
