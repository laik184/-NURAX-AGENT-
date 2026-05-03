
import { useEffect, useRef, useState } from "react";

export function useTerminal() {
  const wsRef = useRef<WebSocket | null>(null);
  const [output, setOutput] = useState<string>("");
  const sessionIdRef = useRef<string | null>(null);

  const start = (cmd: string = "bash") => {
    wsRef.current = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/terminal`);
    wsRef.current.onopen = () => {
      wsRef.current?.send(JSON.stringify({ type: "start", cmd }));
    };
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "data") setOutput((o) => o + msg.data);
      if (msg.type === "started") sessionIdRef.current = msg.sessionId;
    };
  };

  const send = (data: string) => {
    wsRef.current?.send(JSON.stringify({ type: "input", data }));
  };

  const kill = () => {
    wsRef.current?.send(JSON.stringify({ type: "kill" }));
    wsRef.current?.close();
  };

  useEffect(() => () => wsRef.current?.close(), []);

  return { output, start, send, kill };
}
