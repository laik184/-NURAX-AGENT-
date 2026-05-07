import { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { DEVICE_CONFIGS, type DeviceKey } from "./preview-types";
import { DeviceFrame, TabletFrame } from "./device-frames";
import { CrashScreen } from "./CrashScreen";

export interface IframeViewProps {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeKey: number;
  selectedDevice: DeviceKey;
  customWidth: number | null;
  customHeight: number | null;
  previewContainerRef: RefObject<HTMLDivElement>;
  isExecuting: boolean;
  isRunning: boolean;
  onIframeLoad: () => void;
  onSelectDevice: (key: DeviceKey) => void;
  onResizeDragStart: (e: React.MouseEvent, type: "right" | "bottom" | "corner") => void;
  onResetCustomSize: () => void;
  onPlayClick: () => void;
  onOverlayRun: () => void;
}

export function IframeView({
  iframeRef, iframeKey, selectedDevice, customWidth, customHeight, previewContainerRef,
  isExecuting, isRunning, onIframeLoad, onSelectDevice, onResizeDragStart,
  onResetCustomSize, onPlayClick, onOverlayRun,
}: IframeViewProps) {
  const cfg = DEVICE_CONFIGS[selectedDevice];

  if (cfg?.frame === "phone") {
    return (
      <>
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0f18]" style={{ padding: "28px 24px 16px" }}>
            <div style={{
              aspectRatio: `${parseInt(cfg.width!)} / ${parseInt(cfg.height!)}`,
              height: "100%", maxWidth: "100%", maxHeight: "100%",
              position: "relative", flexShrink: 0,
              transition: "aspect-ratio 0.25s cubic-bezier(0.22,1,0.36,1)",
            }}>
              <DeviceFrame deviceKey={selectedDevice}>
                <iframe key={iframeKey} ref={iframeRef} src="http://localhost:5000"
                  className="absolute inset-0 w-full h-full border-none"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  title="Preview" onLoad={onIframeLoad} />
                <CrashScreen isRunning={isRunning} onRun={onOverlayRun} />
              </DeviceFrame>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-1.5 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: "rgba(148,163,184,0.6)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {cfg.label}{cfg.dims && ` · ${cfg.dims}`}
          </span>
          <button onClick={() => onSelectDevice("fullsize")} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ color: "rgba(124,141,255,0.8)", background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.2)" }}>Reset</button>
        </div>
      </>
    );
  }

  if (cfg?.frame === "tablet") {
    return (
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "radial-gradient(ellipse at 40% 35%, #0d1829 0%, #060c18 45%, #020408 100%)", padding: "32px 40px 28px" }}>
          <div style={{ aspectRatio: "16/9", height: "100%", maxWidth: "100%", maxHeight: "100%", position: "relative", flexShrink: 0, transition: "aspect-ratio 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
            <TabletFrame>
              <iframe ref={iframeRef} src="http://localhost:5000"
                className="absolute inset-0 w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                title="Preview" onLoad={onIframeLoad} />
              <CrashScreen isRunning={isRunning} onRun={onOverlayRun} />
            </TabletFrame>
          </div>
        </div>
      </div>
    );
  }

  if (selectedDevice === "fullsize" && !customWidth && !customHeight) {
    return (
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <iframe ref={iframeRef} src="http://localhost:5000"
          className="absolute inset-0 w-full h-full border-none bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          title="Preview" onLoad={onIframeLoad} />
        <CrashScreen isRunning={isRunning} onRun={onOverlayRun} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col items-center justify-center overflow-auto gap-4 ${customWidth ? "bg-[#0d0f18] p-4" : ""}`}>
      <div ref={previewContainerRef} className="relative flex-shrink-0" style={{
        overflow: "visible",
        transition: "width 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s cubic-bezier(0.22,1,0.36,1)",
        ...(selectedDevice === "16:9"
          ? { width: "100%", aspectRatio: "16/9", maxHeight: "100%" }
          : customWidth || customHeight
          ? { width: customWidth ?? "100%", height: customHeight ?? 500 }
          : { width: "100%", height: "100%" }),
      }}>
        <iframe ref={iframeRef} src="http://localhost:5000"
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          title="Preview" onLoad={onIframeLoad} />
        <CrashScreen isRunning={isRunning} onRun={onOverlayRun} />
        {selectedDevice === "fullsize" && (
          <>
            <div onMouseDown={(e) => onResizeDragStart(e, "right")} className="absolute top-0 right-0 w-2 h-full cursor-col-resize group z-10 flex items-center justify-center" title="Drag to resize width">
              <div className="w-1 h-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(124,141,255,0.7)" }} />
            </div>
            <div onMouseDown={(e) => onResizeDragStart(e, "bottom")} className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize group z-10 flex items-center justify-center" title="Drag to resize height">
              <div className="h-1 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(124,141,255,0.7)" }} />
            </div>
            <div onMouseDown={(e) => onResizeDragStart(e, "corner")} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 flex items-end justify-end p-0.5" title="Drag to resize">
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.5 }}>
                <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="rgba(124,141,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </>
        )}
      </div>
      {selectedDevice === "16:9" && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: "rgba(148,163,184,0.7)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>16:9 · 1280 × 720</span>
          <button onClick={() => onSelectDevice("fullsize")} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ color: "rgba(124,141,255,0.8)", background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.2)" }}>Reset</button>
        </div>
      )}
      {selectedDevice === "fullsize" && (customWidth || customHeight) && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: "rgba(148,163,184,0.7)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{Math.round(customWidth ?? 0)} × {Math.round(customHeight ?? 0)}</span>
          <button onClick={onResetCustomSize} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ color: "rgba(124,141,255,0.8)", background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.2)" }}>Reset</button>
        </div>
      )}
      {!isExecuting && cfg?.frame !== "phone" && cfg?.frame !== "tablet" && selectedDevice !== "fullsize" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] bg-opacity-95">
          <div className="text-center space-y-6">
            <p className="text-gray-400 text-sm">Ready to preview</p>
            <Button onClick={onPlayClick} className="bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold px-8 py-3 text-base" data-testid="button-start-now">Start Now</Button>
          </div>
        </div>
      )}
      {isExecuting && cfg?.frame !== "phone" && cfg?.frame !== "tablet" && selectedDevice !== "fullsize" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] bg-opacity-90">
          <div className="text-center space-y-4">
            <p className="text-gray-300 text-sm font-medium">Running...</p>
          </div>
        </div>
      )}
    </div>
  );
}
