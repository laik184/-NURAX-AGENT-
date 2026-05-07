import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, Globe, Server, ChevronDown, X } from "lucide-react";

/* ── Shared Types ── */
export interface ElementInfo {
  tag: string;
  id: string;
  classes: string[];
  rect: { width: number; height: number; top: number; left: number };
  styles: Record<string, string>;
  attributes: Record<string, string>;
}

export type DevToolsTab = "console" | "elements" | "network";

/* ── ProcessingPulse: self-contained animated network SVG ── */
export function ProcessingPulse() {
  const CONSOLE_MESSAGES = [
    "console.run() → success",
    "Fixing bug #4821...",
    "Server reset complete",
    "Hot reload triggered",
    "Building modules...",
    "Resolving dependencies...",
    "Compiling TypeScript...",
    "Optimizing bundle...",
    "Syncing filesystem...",
    "Agent writing code...",
    "Running test suite...",
    "Deploying changes...",
    "I am fixing bugs...",
    "Starting dev server...",
    "Watching for changes...",
  ];

  const [pulseStatusIndex, setPulseStatusIndex] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setPulseStatusIndex(i => (i + 1) % CONSOLE_MESSAGES.length);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 36,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "clamp(3px, 0.8vmin, 6px)",
      pointerEvents: "none",
      userSelect: "none",
      width: "clamp(44px, 9vmin, 68px)",
    }}>
      <div style={{ animation: "pp-float 3.5s ease-in-out infinite", width: "100%" }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 148 128"
          fill="none"
          style={{ animation: "pp-glow-ring 2.8s ease-in-out infinite", overflow: "visible", display: "block" }}
        >
          <line x1="74" y1="10" x2="132" y2="52" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 0s linear infinite" }} />
          <line x1="132" y1="52" x2="110" y2="114" stroke="rgba(139,92,246,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 0.35s linear infinite" }} />
          <line x1="110" y1="114" x2="38" y2="114" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 0.7s linear infinite" }} />
          <line x1="38" y1="114" x2="16" y2="52" stroke="rgba(139,92,246,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 1.05s linear infinite" }} />
          <line x1="16" y1="52" x2="74" y2="10" stroke="rgba(99,102,241,0.85)" strokeWidth="1.5" strokeDasharray="7 4" style={{ animation: "pp-line-flow 2.2s 1.4s linear infinite" }} />
          <line x1="74" y1="10" x2="110" y2="114" stroke="rgba(167,139,250,0.55)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 0.6s linear infinite" }} />
          <line x1="132" y1="52" x2="38" y2="114" stroke="rgba(167,139,250,0.55)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 1.1s linear infinite" }} />
          <line x1="132" y1="52" x2="16" y2="52" stroke="rgba(167,139,250,0.45)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 1.6s linear infinite" }} />
          <line x1="74" y1="10" x2="38" y2="114" stroke="rgba(167,139,250,0.45)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 2.1s linear infinite" }} />
          <line x1="16" y1="52" x2="110" y2="114" stroke="rgba(167,139,250,0.40)" strokeWidth="1" strokeDasharray="5 5" style={{ animation: "pp-line-flow 3.0s 2.6s linear infinite" }} />
          <circle cx="74" cy="10" r="10" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.9)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 0s ease-in-out infinite", transformOrigin: "74px 10px" }} />
          <circle cx="74" cy="10" r="4.5" fill="rgba(165,180,252,1)" style={{ filter: "drop-shadow(0 0 5px rgba(99,102,241,0.9))" }} />
          <circle cx="132" cy="52" r="8.5" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.88)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 0.4s ease-in-out infinite", transformOrigin: "132px 52px" }} />
          <circle cx="132" cy="52" r="3.8" fill="rgba(196,181,253,1)" style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.9))" }} />
          <circle cx="110" cy="114" r="7.5" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.85)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 0.8s ease-in-out infinite", transformOrigin: "110px 114px" }} />
          <circle cx="110" cy="114" r="3.3" fill="rgba(165,180,252,0.97)" style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.8))" }} />
          <circle cx="38" cy="114" r="7.5" fill="rgba(139,92,246,0.12)" stroke="rgba(139,92,246,0.85)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 1.2s ease-in-out infinite", transformOrigin: "38px 114px" }} />
          <circle cx="38" cy="114" r="3.3" fill="rgba(196,181,253,0.95)" style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.8))" }} />
          <circle cx="16" cy="52" r="8.5" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.88)" strokeWidth="1.8" style={{ animation: "pp-node-pulse 2s 1.6s ease-in-out infinite", transformOrigin: "16px 52px" }} />
          <circle cx="16" cy="52" r="3.8" fill="rgba(165,180,252,1)" style={{ filter: "drop-shadow(0 0 5px rgba(99,102,241,0.9))" }} />
          <circle cx="74" cy="64" r="14" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.5)" strokeWidth="1" style={{ animation: "pp-outer-ring 2.4s ease-out infinite", transformOrigin: "74px 64px" }} />
          <circle cx="74" cy="64" r="9" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.75)" strokeWidth="1.5" style={{ animation: "pp-node-pulse 2s 0.2s ease-in-out infinite", transformOrigin: "74px 64px" }} />
          <circle cx="74" cy="64" r="4" fill="rgba(165,180,252,1)" style={{ filter: "drop-shadow(0 0 7px rgba(99,102,241,1))" }} />
          <line x1="74" y1="64" x2="74" y2="10" stroke="rgba(99,102,241,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 0.1s linear infinite" }} />
          <line x1="74" y1="64" x2="132" y2="52" stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 0.5s linear infinite" }} />
          <line x1="74" y1="64" x2="110" y2="114" stroke="rgba(99,102,241,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 0.9s linear infinite" }} />
          <line x1="74" y1="64" x2="38" y2="114" stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 1.3s linear infinite" }} />
          <line x1="74" y1="64" x2="16" y2="52" stroke="rgba(99,102,241,0.35)" strokeWidth="1" strokeDasharray="4 4" style={{ animation: "pp-line-flow 1.8s 1.7s linear infinite" }} />
        </svg>
      </div>

      <div
        key={pulseStatusIndex}
        style={{
          fontSize: "clamp(5px, 1vmin, 7px)",
          fontWeight: 600,
          color: "rgba(199,210,254,0.95)",
          fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
          letterSpacing: "0.03em",
          animation: "pp-msg-in 0.28s ease both",
          whiteSpace: "nowrap",
          background: "rgba(9,10,20,0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "clamp(1px,0.25vmin,2px) clamp(3px,0.9vmin,5px)",
          borderRadius: 999,
          border: "1px solid rgba(99,102,241,0.22)",
          boxShadow: "0 0 8px rgba(99,102,241,0.18)",
          maxWidth: "clamp(60px, 18vmin, 110px)",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        ▸ {CONSOLE_MESSAGES[pulseStatusIndex]}
      </div>
    </div>
  );
}

/* ── DevToolsPanel: receives all devtools state as props ── */
export interface DevToolsPanelProps {
  devToolsOpen: boolean;
  devToolsMinimized: boolean;
  devToolsHeight: number;
  devToolsTab: DevToolsTab;
  consoleLogs: Array<{ type: string; message: string; time: string }>;
  networkRequests: Array<{ method: string; url: string; status: string; type: string; time: string }>;
  networkMode: "normal" | "slow" | "offline";
  followSharedPreview: boolean;
  inspectMode: boolean;
  selectedElementInfo: ElementInfo | null;
  setDevToolsOpen: (v: boolean) => void;
  setDevToolsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  setDevToolsTab: (tab: DevToolsTab) => void;
  setConsoleLogs: React.Dispatch<React.SetStateAction<Array<{ type: string; message: string; time: string }>>>;
  setNetworkRequests: React.Dispatch<React.SetStateAction<Array<{ method: string; url: string; status: string; type: string; time: string }>>>;
  setNetworkMode: React.Dispatch<React.SetStateAction<"normal" | "slow" | "offline">>;
  setFollowSharedPreview: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedElementInfo: (info: ElementInfo | null) => void;
  handleDevToolsResizeMouseDown: (e: React.MouseEvent) => void;
}

export function DevToolsPanel({
  devToolsOpen,
  devToolsMinimized,
  devToolsHeight,
  devToolsTab,
  consoleLogs,
  networkRequests,
  networkMode,
  followSharedPreview,
  inspectMode,
  selectedElementInfo,
  setDevToolsOpen,
  setDevToolsMinimized,
  setDevToolsTab,
  setConsoleLogs,
  setNetworkRequests,
  setNetworkMode,
  setFollowSharedPreview,
  setSelectedElementInfo,
  handleDevToolsResizeMouseDown,
}: DevToolsPanelProps) {
  if (!devToolsOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#050816] border-t border-gray-800 shadow-2xl flex flex-col" style={{ height: devToolsMinimized ? "auto" : `${devToolsHeight}px` }}>
      <div
        className="h-1.5 cursor-row-resize bg-gray-800/80 hover:bg-gray-700 flex-shrink-0"
        onMouseDown={handleDevToolsResizeMouseDown}
      />
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 bg-black">
        <span className="text-xs text-gray-400 ml-3">Network:</span>
        <select
          className="bg-[#111827] border border-gray-700 text-xs rounded px-1 py-0.5 text-gray-200"
          value={networkMode}
          onChange={(e) => setNetworkMode(e.target.value as "normal" | "slow" | "offline")}
        >
          <option value="normal">Normal</option>
          <option value="slow">Slow 3G</option>
          <option value="offline">Offline</option>
        </select>
        <label className="ml-3 flex items-center gap-1 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={followSharedPreview}
            onChange={() => setFollowSharedPreview(v => !v)}
          />
          Follow team session
        </label>
        <Button variant={devToolsTab === "elements" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDevToolsTab("elements")} data-testid="tab-elements">
          <Crosshair className="h-3 w-3 mr-1" />Elements
        </Button>
        <Button variant={devToolsTab === "console" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDevToolsTab("console")} data-testid="tab-webview-logs">
          <Globe className="h-3 w-3 mr-1" />Webview Logs
        </Button>
        <Button variant={devToolsTab === "network" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setDevToolsTab("network")} data-testid="tab-server-logs">
          <Server className="h-3 w-3 mr-1" />Server Logs
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-200" onClick={() => setDevToolsMinimized(v => !v)} data-testid="button-minimize-devtools">
          <ChevronDown className={`h-3 w-3 transition-transform ${devToolsMinimized ? "rotate-180" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-200" onClick={() => setDevToolsOpen(false)} data-testid="button-close-devtools">
          <X className="h-3 w-3" />
        </Button>
      </div>

      {!devToolsMinimized && (
        <>
          {/* Elements / Inspect Tab */}
          {devToolsTab === "elements" && (
            <div className="flex-1 overflow-y-auto flex flex-col font-mono text-xs">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-black">
                <span className="text-[11px] text-gray-400 font-sans">
                  {inspectMode ? "Hover and click any element in the preview" : "Enable inspect from the toolbar ⊕"}
                </span>
                {selectedElementInfo && (
                  <button onClick={() => setSelectedElementInfo(null)} className="ml-auto text-gray-500 hover:text-gray-300 text-xs font-sans" data-testid="button-clear-inspect">
                    Clear
                  </button>
                )}
              </div>

              {!selectedElementInfo ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 p-6">
                  <Crosshair className="h-8 w-8 opacity-30" />
                  <p className="text-center font-sans text-xs">
                    {inspectMode ? "Hover and click any element in the preview" : 'Click "Start Inspect" then click any element in the preview'}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans">Element</p>
                    <div className="bg-black rounded p-2 text-[11px] leading-relaxed" style={{ color: "#a5b4fc" }}>
                      <span style={{ color: "#f87171" }}>&lt;{selectedElementInfo.tag}</span>
                      {selectedElementInfo.id && <span style={{ color: "#fbbf24" }}> id=&quot;{selectedElementInfo.id}&quot;</span>}
                      {selectedElementInfo.classes.length > 0 && <span style={{ color: "#34d399" }}> class=&quot;{selectedElementInfo.classes.join(" ")}&quot;</span>}
                      {Object.entries(selectedElementInfo.attributes).filter(([k]) => k !== "id" && k !== "class").slice(0, 4).map(([k, v]) => (
                        <span key={k} style={{ color: "#94a3b8" }}> {k}=&quot;{v.length > 30 ? v.slice(0, 30) + "…" : v}&quot;</span>
                      ))}
                      <span style={{ color: "#f87171" }}>&gt;</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans">Box Model</p>
                    <div className="bg-black rounded p-2 space-y-1 text-[11px]">
                      <div className="flex justify-between"><span className="text-gray-500">width</span><span className="text-blue-300">{selectedElementInfo.rect.width}px</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">height</span><span className="text-blue-300">{selectedElementInfo.rect.height}px</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">top</span><span className="text-gray-300">{selectedElementInfo.rect.top}px</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">left</span><span className="text-gray-300">{selectedElementInfo.rect.left}px</span></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-sans">Computed Styles</p>
                    <div className="bg-black rounded p-2 space-y-1 text-[11px]">
                      {Object.entries(selectedElementInfo.styles)
                        .filter(([, v]) => v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "")
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-[#94a3b8] shrink-0">{k}</span>
                            <span className="text-[#a5b4fc] text-right break-all">{v.length > 40 ? v.slice(0, 40) + "…" : v}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Webview Logs Tab */}
          {devToolsTab === "console" && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {consoleLogs.length > 0 && (
                <div className="px-3 py-2 border-b border-gray-700 bg-black flex justify-end gap-2">
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-400 hover:text-gray-200" onClick={() => setConsoleLogs([])} data-testid="button-clear-console">
                    Clear
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
                {consoleLogs.length === 0 ? (
                  <p className="text-gray-500">No console logs yet...</p>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-gray-600 flex-shrink-0">{log.time}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold ${
                        log.type === "error" ? "bg-red-900/50 text-red-300" :
                        log.type === "warn" ? "bg-yellow-900/50 text-yellow-300" :
                        log.type === "info" ? "bg-blue-900/50 text-blue-300" :
                        "bg-gray-900/50 text-gray-300"
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                      <span className={`flex-1 ${
                        log.type === "error" ? "text-red-300" :
                        log.type === "warn" ? "text-yellow-300" :
                        log.type === "info" ? "text-blue-300" : "text-gray-200"
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Server Logs Tab */}
          {devToolsTab === "network" && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {networkRequests.length > 0 && (
                <div className="px-3 py-2 border-b border-gray-700 bg-black flex justify-end gap-2">
                  <span className="text-xs text-gray-500">{networkRequests.length} requests</span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-400 hover:text-gray-200" onClick={() => setNetworkRequests([])} data-testid="button-clear-network">
                    Clear
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                {networkRequests.length === 0 ? (
                  <div className="p-3 text-gray-500 text-xs">No network requests yet...</div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {networkRequests.map((req, idx) => (
                      <div key={idx} className="p-3 text-xs hover:bg-gray-800 transition space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 flex-shrink-0 w-12">{req.time}</span>
                          <span className={`px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                            req.method === "GET" ? "bg-blue-900/50 text-blue-300" :
                            req.method === "POST" ? "bg-green-900/50 text-green-300" :
                            "bg-gray-900/50 text-gray-300"
                          }`}>
                            {req.method}
                          </span>
                          <span className="text-gray-300 flex-1 truncate font-mono">{req.url}</span>
                          <span className={`px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                            req.status === "200" ? "bg-green-900/50 text-green-300" :
                            req.status === "error" ? "bg-red-900/50 text-red-300" :
                            "bg-gray-900/50 text-gray-300"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs ml-12 truncate">{req.type.substring(0, 50)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
