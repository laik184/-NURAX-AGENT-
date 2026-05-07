import { MonitorX } from "lucide-react";

export interface CrashScreenProps {
  isRunning: boolean;
  onRun: () => void;
}

export function CrashScreen({ isRunning, onRun }: CrashScreenProps) {
  if (isRunning) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 60,
      background: "#111213",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "clamp(6px, 3%, 16px)",
      padding: "8px",
      overflow: "hidden",
    }}>
      <MonitorX style={{ width: "clamp(28px, 18%, 52px)", height: "clamp(28px, 18%, 52px)", color: "rgba(200,200,200,0.75)", strokeWidth: 1.4, flexShrink: 0 }} />
      <span style={{ color: "#fff", fontSize: "clamp(9px, 4%, 14px)", fontWeight: 700, textAlign: "center", lineHeight: 1.25, whiteSpace: "nowrap" }}>
        Your app is not running
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 2%, 8px)", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onRun}
          style={{
            background: "#22c55e", color: "#fff", borderRadius: 5, border: "none",
            padding: "clamp(4px, 2%, 7px) clamp(8px, 4%, 14px)",
            display: "flex", alignItems: "center", gap: "clamp(3px, 2%, 6px)",
            fontWeight: 700, fontSize: "clamp(9px, 3.5%, 13px)", cursor: "pointer", lineHeight: 1, flexShrink: 0,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <polygon points="1.5,0.8 9.2,5 1.5,9.2" fill="#fff" />
          </svg>
          Run
        </button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(8px, 3.5%, 12px)", whiteSpace: "nowrap" }}>to preview your app.</span>
      </div>
    </div>
  );
}
