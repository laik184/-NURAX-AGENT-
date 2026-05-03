import { useEffect, useRef, useState } from "react";
import { Trash2, RotateCcw, Copy, Check, Terminal, Wifi, WifiOff } from "lucide-react";

type LineKind = "stdout" | "stderr" | "system" | "error";

interface LogLine {
  id: string;
  kind: LineKind;
  text: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

const WELCOME: LogLine[] = [
  { id: "w1", kind: "system", text: "Console connected — agent tool output appears here." },
  { id: "w2", kind: "system", text: "Commands are controlled by the AI agent." },
  { id: "w3", kind: "system", text: "────────────────────────────────────────────────────────" },
];

export function ConsolePanel() {
  const [lines, setLines] = useState<LogLine[]>(WELCOME);
  const [copied, setCopied] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const projectId = Number(window.localStorage.getItem("nura.projectId") || "1") || 1;

  useEffect(() => {
    const es = new EventSource(`/sse/console?projectId=${projectId}`);
    sseRef.current = es;
    es.addEventListener("console", (ev) => {
      try {
        const e = JSON.parse((ev as MessageEvent).data) as { stream?: "stdout" | "stderr"; line?: string };
        if (!e.line) return;
        setLines((prev) => [...prev, { id: uid(), kind: e.stream === "stderr" ? "stderr" : "stdout", text: e.line! }]);
      } catch {
      }
    });
    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [projectId]);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/terminal?projectId=${projectId}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; data?: unknown };
        if (msg.type === "ready") setWsReady(true);
        if (msg.type === "exit") setWsReady(false);
        if (msg.type === "error") setLines((prev) => [...prev, { id: uid(), kind: "error", text: String(msg.data ?? "terminal error") }]);
      } catch {
      }
    };
    ws.onclose = () => setWsReady(false);
    return () => ws.close();
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleClear = () => setLines(WELCOME);
  const handleRestart = () => setLines([...WELCOME, { id: uid(), kind: "system", text: "Console cleared. Agent still controls commands." }]);
  const handleCopy = () => {
    const text = lines.map((l) => `${l.kind === "stdout" ? "" : l.kind === "stderr" ? "! " : ""}${l.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "hsl(222,32%,5.5%)", fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code','Menlo',monospace" }}>
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" style={{ color: "rgba(148,163,184,0.55)" }} />
          <span className="text-xs font-semibold tracking-wide" style={{ color: "rgba(226,232,240,0.7)" }}>Console</span>
          {wsReady ? <Wifi className="h-3 w-3 ml-0.5" style={{ color: "#4ade80" }} /> : <WifiOff className="h-3 w-3 ml-0.5" style={{ color: "rgba(248,113,113,0.7)" }} />}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleClear} title="Clear" data-testid="button-console-clear" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors" style={{ color: "rgba(148,163,184,0.55)" }}><Trash2 className="h-3.5 w-3.5" /><span>Clear</span></button>
          <button onClick={handleRestart} title="Restart" data-testid="button-console-restart" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors" style={{ color: "rgba(148,163,184,0.55)" }}><RotateCcw className="h-3.5 w-3.5" /><span>Restart</span></button>
          <button onClick={handleCopy} title="Copy logs" data-testid="button-console-copy" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors" style={{ color: copied ? "#34d399" : "rgba(148,163,184,0.55)" }}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}<span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0" style={{ lineHeight: "1.75" }}>
        {lines.map((line) => (
          <div key={line.id} className="text-[12px] whitespace-pre-wrap break-all select-text" style={{ color: line.kind === "stderr" ? "#f87171" : line.kind === "error" ? "#f87171" : line.kind === "system" ? "rgba(100,116,139,0.65)" : "rgba(203,213,225,0.88)" }} data-testid={`console-line-${line.kind}`}>
            <span style={{ opacity: 0.35, userSelect: "none", marginRight: 4 }}>{line.kind === "stderr" ? "! " : "  "}</span>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex-shrink-0 px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-[11px] text-muted-foreground">Only the AI agent can run commands in this console.</div>
      </div>
    </div>
  );
}
