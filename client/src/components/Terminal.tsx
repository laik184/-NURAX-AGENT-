
import { useEffect, useRef } from "react";
import { useTerminal } from "../hooks/useTerminal";

export default function Terminal() {
  const { output, start, send } = useTerminal();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    start("bash");

    const onResize = () => {
      const cols = Math.max(80, Math.floor((ref.current?.clientWidth || 600) / 8));
      const rows = Math.max(24, Math.floor((ref.current?.clientHeight || 300) / 16));
      send(JSON.stringify({ type: "resize", cols, rows }));
    };

    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div ref={ref} style={{ background: "#000", color: "#0f0", padding: 8, height: 300 }}>
      <pre style={{ whiteSpace: "pre-wrap" }}>{output}</pre>
      <input
        style={{ width: "100%", background: "#111", color: "#0f0" }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            send((e.target as HTMLInputElement).value + "\n");
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
    </div>
  );
}
