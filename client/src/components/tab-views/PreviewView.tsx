
import React, { useEffect, useState, useRef } from "react";

const PREVIEW_BASE = "http://localhost:3000";
const SSE_URL = "http://localhost:3000/__sse_reload";

const DEVICES = {
  desktop:  { w: "100%",  h: "100%"  },
  tablet:   { w: "800px", h: "450px" },
  oneplus:  { w: "840px", h: "600px" },
  mobile:   { w: "390px", h: "844px" },
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  tablet:  "Tablet 16:9",
  oneplus: "OnePlus Pad Go 2",
  mobile:  "Mobile",
};

/* ───────────────────────────── TABLET 16:9 FRAME ───────────────────────────── */
function TabletFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: "800px",
        height: "450px",
        /* cinematic float: 3-layer shadow stack */
        filter: [
          "drop-shadow(0 50px 100px rgba(0,0,0,0.98))",
          "drop-shadow(0 20px 40px rgba(0,0,0,0.80))",
          "drop-shadow(0 4px 10px rgba(0,0,0,0.60))",
        ].join(" "),
      }}
    >

      {/* ░░ LAYER 1 — Base body: multi-stop graphite gradient ░░ */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "44px",
        background: [
          "linear-gradient(180deg,",
          "  #484848 0%,",    /* top — lighter catch-light */
          "  #323232 8%,",
          "  #242424 22%,",
          "  #191919 45%,",   /* mid — neutral graphite */
          "  #111111 72%,",
          "  #0a0a0a 88%,",
          "  #060606 100%",   /* bottom — deep shadow weight */
          ")",
        ].join(""),
      }} />

      {/* ░░ LAYER 2 — Outer 1px border ring (no glow) ░░ */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "44px",
        boxShadow: "0 0 0 1px rgba(0,0,0,1)",
      }} />

      {/* ░░ LAYER 3 — Inner top-edge shine (inset) ░░ */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "44px",
        boxShadow: [
          "inset 0 1.5px 0 rgba(255,255,255,0.20)",  /* top shine */
          "inset 0 -1.5px 0 rgba(0,0,0,0.90)",       /* bottom dark */
        ].join(", "),
      }} />

      {/* ░░ LAYER 4 — Side lighting: left dark / right bright ░░ */}
      {/* left: shadow side */}
      <div style={{
        position: "absolute",
        left: 0, top: "14px", bottom: "14px", width: "5px",
        borderRadius: "5px 0 0 5px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.05))",
      }} />
      {/* right: light side — fill */}
      <div style={{
        position: "absolute",
        right: 0, top: "14px", bottom: "14px", width: "4px",
        borderRadius: "0 4px 4px 0",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.02))",
      }} />
      {/* right: 1px crisp highlight stripe */}
      <div style={{
        position: "absolute",
        right: "2px", top: "28px", bottom: "28px", width: "1px",
        background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.30) 50%, transparent)",
      }} />

      {/* ░░ LAYER 5 — Top bezel band (slightly lighter so camera pops) ░░ */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: "40px",
        borderRadius: "44px 44px 0 0",
        background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10,
      }}>
        {/* Camera — phone-style prominent punch-hole */}
        <div style={{
          position: "relative",
          marginTop: "3px",
          width: "16px", height: "16px", borderRadius: "50%",
          /* outer ring — like phone camera housing */
          background: "linear-gradient(145deg, #1a1a1a 0%, #050505 100%)",
          boxShadow: [
            "0 0 0 2px rgba(255,255,255,0.30)",    /* bright visible ring */
            "0 0 0 3.5px rgba(255,255,255,0.08)",  /* soft outer halo */
            "0 0 0 4.5px rgba(0,0,0,0.6)",         /* dark separator */
            "inset 0 2px 6px rgba(0,0,0,1)",       /* deep lens hole depth */
            "inset 0 -1px 3px rgba(0,0,0,0.95)",
          ].join(", "),
        }}>
          {/* Inner lens — pure black */}
          <div style={{
            position: "absolute",
            inset: "3px",
            borderRadius: "50%",
            background: "#000",
          }} />
          {/* Lens glint — top-left micro highlight */}
          <div style={{
            position: "absolute", top: "3px", left: "4px",
            width: "4px", height: "3px", borderRadius: "50%",
            background: "rgba(255,255,255,0.50)",
          }} />
        </div>

        {/* Bezel ↔ screen divider shadow */}
        <div style={{
          position: "absolute", bottom: 0, left: "18px", right: "18px",
          height: "3px",
          background: "linear-gradient(to right, transparent, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, transparent)",
          filter: "blur(1.5px)",
        }} />
      </div>

      {/* ░░ LAYER 6 — Screen well (recessed inset) ░░ */}
      <div style={{
        position: "absolute",
        top: "38px", left: "16px", right: "16px", bottom: "16px",
        borderRadius: "30px",
        overflow: "hidden",
        background: "#000",
        boxShadow: [
          "inset 0 4px 14px rgba(0,0,0,1)",
          "inset 0 -3px 8px rgba(0,0,0,0.90)",
          "inset 4px 0 8px rgba(0,0,0,0.80)",
          "inset -4px 0 8px rgba(0,0,0,0.80)",
        ].join(", "),
      }}>
        {children}

        {/* Glass diagonal reflection 3-5% */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(125deg, rgba(255,255,255,0.050) 0%, rgba(255,255,255,0.012) 30%, transparent 52%)",
        }} />

        {/* Screen-edge vignette */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          borderRadius: "30px",
          boxShadow: "inset 0 0 22px rgba(0,0,0,0.40)",
        }} />
      </div>

      {/* ░░ LAYER 7 — Top outer 1px shimmer ░░ */}
      <div style={{
        position: "absolute",
        top: "1px", left: "24px", right: "24px", height: "1px",
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.26) 22%, rgba(255,255,255,0.26) 78%, transparent)",
      }} />

      {/* ░░ LAYER 8 — Bottom weight shadow ░░ */}
      <div style={{
        position: "absolute",
        bottom: "5px", left: "50px", right: "50px", height: "8px",
        borderRadius: "50%",
        background: "linear-gradient(to right, transparent, rgba(0,0,0,0.85) 28%, rgba(0,0,0,0.85) 72%, transparent)",
        filter: "blur(4px)",
      }} />

    </div>
  );
}

/* ─────────────────────── ONEPLUS PAD GO 2 FRAME (7:5 landscape) ─────────────────────── */
function OnePlusFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: "840px",
        height: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter:
          "drop-shadow(0 30px 60px rgba(0,0,0,0.92)) drop-shadow(0 6px 20px rgba(0,0,0,0.65))",
      }}
    >
      {/* Outer frame — OnePlus flat-edge aluminium */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "22px",
          background:
            "linear-gradient(160deg, #2e2e2e 0%, #1a1a1a 40%, #111111 70%, #0c0c0c 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(0,0,0,0.7), inset -1px 0 3px rgba(255,255,255,0.04), inset 1px 0 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.9)",
        }}
      />

      {/* Flat left edge highlight (OnePlus flat sides) */}
      <div
        style={{
          position: "absolute",
          left: "0px",
          top: "22px",
          bottom: "22px",
          width: "2px",
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02))",
        }}
      />

      {/* Right edge — side camera position indicator line */}
      <div
        style={{
          position: "absolute",
          right: "0px",
          top: "22px",
          bottom: "22px",
          width: "2px",
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.03))",
        }}
      />

      {/* Top bezel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "32px",
          borderRadius: "22px 22px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        {/* Camera — OnePlus Pad Go 2 has top-center camera in landscape */}
        <div
          style={{
            position: "relative",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 33% 33%, #232323, #060606)",
            boxShadow:
              "0 0 0 2px rgba(255,255,255,0.07), 0 0 0 3.5px rgba(255,255,255,0.03), inset 0 1px 3px rgba(0,0,0,1)",
          }}
        >
          {/* Camera lens glint */}
          <div
            style={{
              position: "absolute",
              top: "2px",
              left: "2px",
              width: "2.5px",
              height: "2.5px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.4)",
            }}
          />
        </div>

        {/* Top bezel divider shadow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "22px",
            right: "22px",
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(0,0,0,0.5) 25%, rgba(0,0,0,0.5) 75%, transparent)",
          }}
        />
      </div>

      {/* Screen inset — slightly deeper bezel (OnePlus Pad Go 2 has visible bezel) */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "15px",
          right: "15px",
          bottom: "15px",
          borderRadius: "7px",
          overflow: "hidden",
          background: "#000",
          boxShadow:
            "inset 0 3px 8px rgba(0,0,0,1), inset 0 -2px 5px rgba(0,0,0,0.8), inset 2px 0 5px rgba(0,0,0,0.7), inset -2px 0 5px rgba(0,0,0,0.7)",
        }}
      >
        {children}

        {/* Screen glass reflection */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.035) 0%, transparent 45%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* OnePlus logo area — bottom center (subtle) */}
      <div
        style={{
          position: "absolute",
          bottom: "5px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "3px",
          opacity: 0.18,
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: "7px",
            fontFamily: "sans-serif",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}
        >
          OnePlus
        </span>
      </div>

      {/* Outer top highlight */}
      <div
        style={{
          position: "absolute",
          top: "1px",
          left: "22px",
          right: "22px",
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.14) 70%, transparent)",
        }}
      />

      {/* Bottom depth shadow */}
      <div
        style={{
          position: "absolute",
          bottom: "3px",
          left: "40px",
          right: "40px",
          height: "5px",
          background:
            "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, transparent)",
          filter: "blur(3px)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────── MOBILE FRAME ─────────────────────────── */
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: "390px",
        height: "844px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.85))",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "48px",
          background:
            "linear-gradient(165deg, #3a3a3a 0%, #1e1e1e 50%, #0d0d0d 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.8)",
        }}
      />

      {/* Dynamic island */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120px",
          height: "34px",
          borderRadius: "20px",
          background: "#000",
          zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          right: "12px",
          bottom: "12px",
          borderRadius: "38px",
          overflow: "hidden",
          background: "#000",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
        }}
      >
        {children}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(130deg, rgba(255,255,255,0.04) 0%, transparent 50%)",
            pointerEvents: "none",
            borderRadius: "38px",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "1px",
          left: "40px",
          right: "40px",
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, transparent)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
export default function PreviewView() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const ev = new EventSource(SSE_URL);
    ev.onopen = () => setStatus("online");

    ev.addEventListener("reload", () => {
      setReloadCount((c) => c + 1);
      if (iframeRef.current) {
        iframeRef.current.src = PREVIEW_BASE + "?t=" + Date.now();
      }
    });

    ev.onerror = () => {
      setStatus("offline");
      setErrorCount((c) => c + 1);
    };

    return () => ev.close();
  }, []);

  const iframeEl = (
    <iframe
      ref={iframeRef}
      src={PREVIEW_BASE}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#0f172a]">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold">Live Preview</span>

          <span className={status === "online" ? "text-green-400" : "text-red-400"}>
            ● {status}
          </span>

          <span className="text-gray-400">reloads: {reloadCount}</span>

          {errorCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-[2px] rounded">
              errors: {errorCount}
            </span>
          )}
        </div>

        {/* Device Switch */}
        <div className="flex gap-1">
          {(["desktop", "tablet", "oneplus", "mobile"] as const).map((d) => (
            <button
              key={d}
              data-testid={`button-device-${d}`}
              onClick={() => setDevice(d)}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                device === d
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-600 text-gray-400 hover:border-gray-400"
              }`}
            >
              {DEVICE_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "auto",
          background:
            device === "desktop"
              ? "#000"
              : "radial-gradient(ellipse at 50% 50%, #0b1a2e 0%, #060e1c 55%, #000000 100%)",
        }}
      >
        {device === "desktop" ? (
          <div style={{ position: "absolute", inset: 0 }}>
            {iframeEl}
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              minHeight: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px",
              boxSizing: "border-box",
            }}
          >
            {device === "tablet" && <TabletFrame>{iframeEl}</TabletFrame>}
            {device === "oneplus" && <OnePlusFrame>{iframeEl}</OnePlusFrame>}
            {device === "mobile" && <MobileFrame>{iframeEl}</MobileFrame>}
          </div>
        )}
      </div>
    </div>
  );
}
