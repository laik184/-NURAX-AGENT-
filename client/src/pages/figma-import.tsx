import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Palette, ImageIcon, Layout, ArrowRight, ExternalLink } from "lucide-react";
import { SiFigma } from "react-icons/si";
import { useLocation } from "wouter";
import { ImportLoadingOverlay } from "@/components/import-loading-overlay";

export default function FigmaImport() {
  const [, setLocation] = useLocation();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const importItems = [
    { icon: Palette, label: "Theme & components", desc: "Colors, fonts, and reusable UI blocks" },
    { icon: ImageIcon, label: "Assets & icons", desc: "Exported images, SVGs, and vectors" },
    { icon: Layout, label: "App scaffolding", desc: "Page structure and layout hierarchy" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto text-white" style={{ background: "hsl(222,30%,7%)" }}>
      {importing && (
        <ImportLoadingOverlay
          serviceName="Figma"
          serviceColor="#f24e1e"
          serviceIcon={<SiFigma className="w-9 h-9 text-white" />}
          steps={[
            "Connecting to Figma…",
            "Reading design file…",
            "Converting frames to components…",
            "Generating styles & assets…",
            "Setting up workspace…",
          ]}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.07]" style={{ background: "hsl(222,30%,7%)" }}>
        <div className="flex h-14 items-center px-4 gap-3">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-14">
        <div className="w-full max-w-lg">
          {/* Title */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f24e1e] via-[#a259ff] to-[#1abcfe] flex items-center justify-center">
                  <SiFigma className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-white" data-testid="heading-figma-import">
                  Import Figma Design
                </h1>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Convert your Figma frames into live apps using Agent.
              </p>
            </div>
            <a
              href="#"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 flex-shrink-0"
              data-testid="button-docs"
            >
              <ExternalLink className="w-3 h-3" />
              Docs
            </a>
          </div>

          <div className="h-px bg-white/[0.07] mb-7" />

          <div className="space-y-6">
            {/* Figma URL */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Figma File URL
              </label>
              <input
                ref={inputRef}
                type="text"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/file/..."
                data-testid="input-figma-url"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-muted-foreground/50 outline-none transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(124,141,255,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,141,255,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <p className="text-xs text-muted-foreground">
                Or{" "}
                <button className="text-primary/80 hover:text-primary transition-colors underline underline-offset-2">
                  connect your Figma account
                </button>{" "}
                to browse files directly.
              </p>
            </div>

            {/* What we import */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What we'll import</p>
              <div className="space-y-3">
                {importItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connect card */}
            <div
              className="rounded-xl p-5 flex items-center gap-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f24e1e] via-[#a259ff] to-[#1abcfe] flex items-center justify-center flex-shrink-0">
                <SiFigma className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Connect Figma account</p>
                <p className="text-xs text-muted-foreground">Browse and import frames directly</p>
              </div>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                data-testid="button-login-figma"
              >
                Log in
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                data-testid="button-import-design"
                onClick={() => setImporting(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #7c8dff, #a78bfa)",
                  boxShadow: "0 0 24px rgba(124,141,255,0.35), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                Import Design
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
