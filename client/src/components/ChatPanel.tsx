import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, FileText, FileCode, Trash2, Terminal, Package, Server,
  RefreshCw, Database, GitBranch, Globe, Camera, Monitor, Eye,
  ScrollText, Zap, Link, Lock, Sparkles, Bot, History,
  MessageSquarePlus, Plus, Paperclip, ImageIcon, Send, ChevronDown,
  CheckCircle2, Bug, FlaskConical, Activity,
  Search, Key, FilePlus, TerminalSquare,
  BookOpen, ExternalLink, Copy, FolderOpen, Wrench,
  HelpCircle, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentMarkdown } from "@/components/AgentMarkdown";
import { CheckpointCard, type CheckpointData } from "@/components/CheckpointCard";
import { type AgentStreamItem } from "@/components/AgentActionFeed";
import { FileDiffCard, generateMockDiffs, type FileDiff } from "@/components/FileDiffCard";
import { AgentsButton } from "@/components/AgentsHub";
import { getAgentMode } from "@/hooks/useAgentMode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─────────────────────────── Tool maps ─────────────────────────── */

export const TOOL_ICON_MAP: Record<string, React.ElementType> = {
  "analysis.think":     Brain,
  "file.read":          FileText,
  "file.write":         FileCode,
  "file.delete":        Trash2,
  "console.run":        Terminal,
  "package.install":    Package,
  "package.remove":     Package,
  "server.start":       Server,
  "server.restart":     RefreshCw,
  "db.push":            Database,
  "db.migrate":         Database,
  "git.clone":          GitBranch,
  "git.commit":         GitBranch,
  "deploy.publish":     Globe,
  "screenshot.capture": Camera,
  "ui.render":          Monitor,
  "preview.open":       Eye,
  "logs.stream":        ScrollText,
  "api.call":           Link,
  "auth.login":         Lock,
  "webhook.trigger":    Zap,
  "debug.run":          Bug,
  "test.run":           FlaskConical,
  "monitor.check":      Activity,
  "search.web":         Search,
  "search.code":        Search,
  "env.read":           Key,
  "env.write":          Key,
  "shell.exec":         TerminalSquare,
  "file.create":        FilePlus,
};

export const TOOL_COLOR_MAP: Record<string, string> = {
  "analysis.think":     "#a78bfa",
  "file.read":          "#7dd3fc",
  "file.write":         "#86efac",
  "file.delete":        "#f87171",
  "console.run":        "#fbbf24",
  "package.install":    "#fb923c",
  "package.remove":     "#fb923c",
  "server.start":       "#4ade80",
  "server.restart":     "#fb923c",
  "db.push":            "#34d399",
  "db.migrate":         "#34d399",
  "git.clone":          "#86efac",
  "git.commit":         "#86efac",
  "deploy.publish":     "#60a5fa",
  "screenshot.capture": "#f472b6",
  "ui.render":          "#c084fc",
  "preview.open":       "#f472b6",
  "logs.stream":        "#94a3b8",
  "api.call":           "#38bdf8",
  "auth.login":         "#facc15",
  "webhook.trigger":    "#818cf8",
  "debug.run":          "#f87171",
  "test.run":           "#34d399",
  "monitor.check":      "#a78bfa",
  "search.web":         "#f97316",
  "search.code":        "#22d3ee",
  "env.read":           "#facc15",
  "env.write":          "#fbbf24",
  "shell.exec":         "#a3e635",
  "file.create":        "#86efac",
};

export const TOOL_EMOJI_MAP: Record<string, string> = {
  "analysis.think":     "🧠",
  "file.read":          "📁",
  "file.write":         "📁",
  "file.delete":        "📁",
  "console.run":        "💻",
  "package.install":    "📦",
  "package.remove":     "📦",
  "server.start":       "🟢",
  "server.restart":     "🔄",
  "db.push":            "🗄️",
  "db.migrate":         "🗄️",
  "git.clone":          "🌿",
  "git.commit":         "🌿",
  "deploy.publish":     "🚀",
  "screenshot.capture": "📸",
  "ui.render":          "🖥️",
  "preview.open":       "👁️",
  "logs.stream":        "📜",
  "api.call":           "🔗",
  "auth.login":         "🔐",
  "webhook.trigger":    "📡",
  "search.web":         "🔍",
  "search.code":        "🔎",
  "env.read":           "🔑",
  "env.write":          "🔑",
  "shell.exec":         "⚡",
  "file.create":        "📄",
};

/* ─────────────────────────── Animation map ─────────────────────── */

type AnimationStyle = "spin" | "pulse" | "bounce" | "flash" | "ping" | "shake";

export const TOOL_ANIMATION_MAP: Record<string, AnimationStyle> = {
  "analysis.think":     "pulse",
  "file.read":          "bounce",
  "file.write":         "bounce",
  "file.delete":        "shake",
  "console.run":        "flash",
  "package.install":    "spin",
  "package.remove":     "spin",
  "server.start":       "pulse",
  "server.restart":     "spin",
  "db.push":            "ping",
  "db.migrate":         "ping",
  "git.clone":          "spin",
  "git.commit":         "pulse",
  "deploy.publish":     "bounce",
  "screenshot.capture": "flash",
  "ui.render":          "pulse",
  "preview.open":       "flash",
  "logs.stream":        "pulse",
  "api.call":           "ping",
  "auth.login":         "pulse",
  "webhook.trigger":    "flash",
  "debug.run":          "shake",
  "test.run":           "ping",
  "monitor.check":      "pulse",
  "search.web":         "spin",
  "search.code":        "spin",
  "env.read":           "flash",
  "env.write":          "flash",
  "shell.exec":         "flash",
  "file.create":        "bounce",
};

/* ─────────────────────────── Action helpers ─────────────────────── */

/** Map tool name → markdown anchor inside server/agents/TOOLS.md (best-effort) */
function toolDocAnchor(tool: string): string {
  // tool names are like `file.read`, `console.run` → loose match in inventory
  return tool.replace(/[._]/g, "-");
}

/**
 * Backend-driven open-file action.
 * POSTs to /api/inventory/actions/open-file so the backend reads the file,
 * broadcasts the action through the event bus (so other panels see it),
 * and returns content + detected language.
 */
async function fetchFileContent(filePath: string): Promise<{ content: string; lang: string }> {
  try {
    const res = await fetch("/api/inventory/actions/open-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      return { content: String(data.content ?? ""), lang: String(data.lang ?? "plaintext") };
    }
    const errMsg = data?.error || `HTTP ${res.status}`;
    return { content: `// Could not load ${filePath}\n// ${errMsg}`, lang: "plaintext" };
  } catch (e: any) {
    return { content: `// Error loading ${filePath}\n// ${e?.message ?? e}`, lang: "plaintext" };
  }
}

/** Invoke a backend-registered tool by name (used by tool-chip "Run again"). */
async function invokeToolBackend(name: string, args: Record<string, unknown> = {}) {
  try {
    const res = await fetch(`/api/inventory/tools/${encodeURIComponent(name)}/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args }),
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

function guessLangFromPath(p: string): string {
  const ext = (p.split(".").pop() ?? "").toLowerCase();
  return ({
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", md: "markdown", css: "css", html: "html",
    py: "python", go: "go", rs: "rust",
  } as Record<string, string>)[ext] ?? "plaintext";
}

/* ─────────────────────────── ToolGroupLine ─────────────────────── */

const TOOL_GROUP_STYLES = `
  @keyframes tg-fade-in   { from{opacity:0;transform:translateY(-2px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tg-expand-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  .tg-fade-in   { animation: tg-fade-in   0.14s ease-out both; }
  .tg-expand-in { animation: tg-expand-in 0.18s ease-out both; }
`;

interface ToolGroupLineProps {
  actions: AgentStreamItem[];
  onOpenFile?: (path: string) => void;
}

function ToolGroupLine({ actions, onOpenFile }: ToolGroupLineProps) {
  const [expanded, setExpanded] = useState(false);
  const isSingle = actions.length === 1;

  return (
    <div className="tg-fade-in flex flex-col gap-0" data-testid="tool-group-line">
      <style>{TOOL_GROUP_STYLES}</style>

      {/* ── Collapsed pill row — click to expand ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left group rounded-md px-1 py-0.5 -mx-1 transition-colors hover:bg-white/[0.03]"
        data-testid="button-tool-group-toggle"
      >
        {/* Colored tool icons */}
        {actions.slice(0, 5).map((action, idx) => {
          const tool  = action.tool ?? "analysis.think";
          const Icon  = TOOL_ICON_MAP[tool] ?? Brain;
          const color = TOOL_COLOR_MAP[tool] ?? "#a78bfa";
          return (
            <Icon
              key={idx}
              className="flex-shrink-0 transition-opacity group-hover:opacity-80"
              style={{ width: 13, height: 13, color, strokeWidth: 1.6 }}
              title={tool}
            />
          );
        })}

        <span style={{ color: "rgba(100,116,139,0.2)", fontSize: 10, userSelect: "none" }}>·</span>

        <span className="text-[11px] leading-none flex-1 truncate" style={{ color: "rgba(100,116,139,0.6)" }}>
          {isSingle ? actions[0].content : `${actions.length} actions`}
        </span>

        {/* Chevron — always visible on hover, rotates when expanded */}
        <ChevronDown
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
          style={{
            width: 11, height: 11,
            color: "rgba(100,116,139,0.5)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div
          className="tg-expand-in mt-1.5 rounded-xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          data-testid="tool-group-detail-panel"
        >
          {actions.map((action, idx) => {
            const tool    = action.tool ?? "analysis.think";
            const Icon    = TOOL_ICON_MAP[tool] ?? Brain;
            const color   = TOOL_COLOR_MAP[tool] ?? "#a78bfa";
            const isLast  = idx === actions.length - 1;

            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 px-3 py-2.5"
                style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.045)" }}
              >
                {/* Left: colored icon box */}
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15`, border: `1px solid ${color}28` }}
                >
                  <Icon style={{ width: 12, height: 12, color, strokeWidth: 1.75 }} />
                </div>

                {/* Right: content */}
                <div className="flex-1 min-w-0">
                  {/* Row: chip + label + check */}
                  <div className="flex items-center gap-1.5">
                    {/* Clickable tool chip — opens action menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded flex-shrink-0 hover:opacity-100 transition-opacity cursor-pointer outline-none focus:ring-1 focus:ring-white/20"
                          style={{
                            background: `${color}12`,
                            border: `1px solid ${color}25`,
                            color: `${color}bb`,
                          }}
                          title={`Actions for ${tool}`}
                          data-testid={`button-tool-chip-${tool}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {tool}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                          <Wrench className="h-3 w-3" style={{ color }} />
                          <span className="font-mono">{tool}</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => onOpenFile?.("server/agents/TOOLS.md")}
                          data-testid={`menu-item-tool-docs-${tool}`}
                        >
                          <BookOpen className="h-3.5 w-3.5" /> View tool docs
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => onOpenFile?.("server/agents/AGENTS.md")}
                          data-testid={`menu-item-agent-inventory-${tool}`}
                        >
                          <Bot className="h-3.5 w-3.5" /> View agents inventory
                        </DropdownMenuItem>
                        {action.meta?.file && (
                          <DropdownMenuItem
                            className="text-xs gap-2 cursor-pointer"
                            onClick={() => onOpenFile?.(action.meta!.file!)}
                            data-testid={`menu-item-open-source-${tool}`}
                          >
                            <FolderOpen className="h-3.5 w-3.5" /> Open source file
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={async () => {
                            const r = await invokeToolBackend(tool);
                            // Backend already broadcasts via bus → SSE will render in chat
                            if (!r?.ok) {
                              console.warn(`[tool ${tool}] invoke failed:`, r?.error);
                            }
                          }}
                          data-testid={`menu-item-run-tool-${tool}`}
                        >
                          <Zap className="h-3.5 w-3.5" /> Run via backend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => navigator.clipboard?.writeText(tool)}
                          data-testid={`menu-item-copy-tool-${tool}`}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy tool name
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span
                      className="text-[11px] font-medium truncate flex-1"
                      style={{ color: "rgba(203,213,225,0.8)" }}
                    >
                      {action.content}
                    </span>
                    <CheckCircle2
                      className="flex-shrink-0 ml-auto"
                      style={{ width: 12, height: 12, color: "rgba(74,222,128,0.75)" }}
                    />
                  </div>

                  {/* Terminal / log output */}
                  {action.meta?.logs && (
                    <div
                      className="mt-2 rounded-md px-2.5 py-2 text-[9.5px] font-mono leading-relaxed"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        border: `1px solid ${color}18`,
                        borderLeft: `2px solid ${color}50`,
                        color: "rgba(148,163,184,0.7)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {action.meta.logs}
                    </div>
                  )}

                  {/* File paths — clickable with action menu */}
                  {action.meta?.file && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="mt-1.5 flex items-center gap-1 text-[9.5px] font-mono w-full text-left rounded px-1 -mx-1 hover:bg-white/[0.04] transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-white/20"
                          style={{ color: `${color}88` }}
                          title={`Open ${action.meta.file}`}
                          data-testid={`button-file-path-${idx}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>→</span>
                          <span className="truncate">{action.meta.file}</span>
                          <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-60 flex-shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                          <FileText className="h-3 w-3" style={{ color }} />
                          <span className="font-mono truncate">{action.meta.file}</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => onOpenFile?.(action.meta!.file!)}
                          data-testid={`menu-item-open-file-${idx}`}
                        >
                          <FolderOpen className="h-3.5 w-3.5" /> Open in editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => navigator.clipboard?.writeText(action.meta!.file!)}
                          data-testid={`menu-item-copy-path-${idx}`}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy path
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── LiveActionBar + ThinkingBubble ─────── */

const LIVE_ACTION_CSS = `
  @keyframes la-spin    { to { transform: rotate(360deg); } }
  @keyframes la-pulse   { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.55; } }
  @keyframes la-bounce  { 0%,100% { transform: translateY(0); } 45% { transform: translateY(-4px); } }
  @keyframes la-flash   { 0%,100% { opacity: 1; } 50% { opacity: 0.12; } }
  @keyframes la-shake   { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }
  @keyframes la-ping    { 0% { transform: scale(1); opacity: 0.9; } 80%,100% { transform: scale(2); opacity: 0; } }
  @keyframes la-dot-hop { 0%,100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-3px); opacity: 1; } }
  @keyframes la-enter   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes la-glow-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); } 50% { box-shadow: 0 0 12px 2px rgba(167,139,250,0.22); } }
  @keyframes la-think-dot { 0%,80%,100% { transform:scale(0.55); opacity:0.3; } 40% { transform:scale(1); opacity:1; } }
  .la-spin         { animation: la-spin    0.85s linear infinite; }
  .la-pulse        { animation: la-pulse   1.1s ease-in-out infinite; }
  .la-bounce       { animation: la-bounce  0.75s ease-in-out infinite; }
  .la-flash        { animation: la-flash   0.65s ease-in-out infinite; }
  .la-shake        { animation: la-shake   0.45s ease-in-out infinite; }
  .la-enter        { animation: la-enter   0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .la-glow-pulse   { animation: la-glow-pulse 1.8s ease-in-out infinite; }
  .la-think-dot-1  { animation: la-think-dot 1.4s ease-in-out 0ms   infinite; }
  .la-think-dot-2  { animation: la-think-dot 1.4s ease-in-out 200ms infinite; }
  .la-think-dot-3  { animation: la-think-dot 1.4s ease-in-out 400ms infinite; }
`;

/* Thinking bubble — shown while analysis.think is active */
function ThinkingBubble() {
  return (
    <div className="la-enter flex gap-2 items-start" data-testid="thinking-bubble">
      <style>{LIVE_ACTION_CSS}</style>
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center la-glow-pulse mt-0.5"
        style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c8dff 100%)" }}
      >
        <Brain className="h-3.5 w-3.5 text-white la-pulse" />
      </div>
      {/* Bubble */}
      <div
        className="flex flex-col gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
        style={{
          background: "rgba(167,139,250,0.07)",
          border: "1px solid rgba(167,139,250,0.2)",
          minWidth: 120,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold" style={{ color: "rgba(167,139,250,0.95)" }}>
            Thinking
          </span>
          <span className="flex items-end gap-[3px] pb-[1px]">
            <span className="la-think-dot-1 w-[4px] h-[4px] rounded-full inline-block" style={{ background: "#a78bfa" }} />
            <span className="la-think-dot-2 w-[4px] h-[4px] rounded-full inline-block" style={{ background: "#a78bfa" }} />
            <span className="la-think-dot-3 w-[4px] h-[4px] rounded-full inline-block" style={{ background: "#a78bfa" }} />
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.55)" }}>
          Analyzing request and planning steps
        </span>
      </div>
    </div>
  );
}

/* Working bar — shown while non-think tools are running */
function LiveActionBar({ action }: { action: AgentStreamItem }) {
  const tool      = action.tool ?? "analysis.think";
  const isThink   = tool === "analysis.think";
  const Icon      = TOOL_ICON_MAP[tool] ?? Brain;
  const color     = TOOL_COLOR_MAP[tool] ?? "#a78bfa";
  const anim      = TOOL_ANIMATION_MAP[tool] ?? "pulse";
  const emoji     = TOOL_EMOJI_MAP[tool] ?? "⚙️";
  const label     = isThink ? "Thinking" : "Working";

  return (
    <div className="la-enter flex gap-2 items-start" data-testid="live-action-bar">
      <style>{LIVE_ACTION_CSS}</style>

      {/* Avatar with tool color */}
      <div
        className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: `${color}22`, border: `1px solid ${color}40` }}
      >
        {/* ping ring */}
        {anim === "ping" && (
          <span
            className="absolute rounded-full"
            style={{ width: 18, height: 18, background: color, opacity: 0.18, animation: "la-ping 1.1s ease-out infinite" }}
          />
        )}
        <Icon
          className={`la-${anim} flex-shrink-0`}
          style={{ width: 12, height: 12, color, strokeWidth: 1.75 }}
        />
      </div>

      {/* Text bubble */}
      <div
        className="flex flex-col gap-1 px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
        style={{
          background: `${color}0d`,
          border: `1px solid ${color}28`,
          minWidth: 140,
        }}
      >
        {/* Label row */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30`, color: `${color}dd` }}>
            {tool}
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "rgba(226,232,240,0.9)" }}>
            {label}
          </span>
          {/* animated dots */}
          <span className="flex items-end gap-[3px] pb-[1px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="rounded-full inline-block"
                style={{
                  width: 3.5, height: 3.5,
                  background: color,
                  animation: `la-think-dot 1.3s ease-in-out ${i * 180}ms infinite`,
                }}
              />
            ))}
          </span>
        </div>

        {/* Content / emoji */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] leading-none">{emoji}</span>
          <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>
            {action.content}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Types ─────────────────────────────── */

interface QuestionData {
  text: string;
  options: string[];
  questionId: string;
  runId: string;
  answered?: string;
}

type ChatMessage =
  | { role: "user";        content: string;               time: string }
  | { role: "agent";       content: string;               time: string }
  | { role: "tool_group";  actions: AgentStreamItem[];    time: string }
  | { role: "diff";        diffs: FileDiff[];             time: string }
  | { role: "checkpoint";  checkpoint: CheckpointData;    time: string }
  | { role: "question";    question: QuestionData;        time: string };

/* ─────────────────────── QuestionCard component ────────────────── */

function QuestionCard({
  data,
  onAnswer,
}: {
  data: QuestionData;
  onAnswer: (questionId: string, runId: string, answer: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5"
      style={{ background: "rgba(124,141,255,0.07)", border: "1px solid rgba(124,141,255,0.2)" }}
      data-testid={`question-card-${data.questionId}`}
    >
      <div className="flex items-start gap-2">
        <HelpCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
        <p className="text-[12px] leading-relaxed text-foreground font-medium">{data.text}</p>
      </div>
      {data.answered ? (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "rgba(74,222,128,0.08)" }}>
          <CheckCheck className="h-3 w-3" style={{ color: "#4ade80" }} />
          <span className="text-[11px]" style={{ color: "#4ade80" }}>Answered: <strong>{data.answered}</strong></span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(data.questionId, data.runId, opt)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: "rgba(124,141,255,0.12)",
                border: "1px solid rgba(124,141,255,0.28)",
                color: "rgba(226,232,240,0.9)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,141,255,0.25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,141,255,0.12)"; }}
              data-testid={`question-option-${data.questionId}-${opt.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Chat history / prompts fetching helpers (module-level) ──── */

async function fetchChatHistory(projectId: number) {
  const res = await fetch(`/api/chat/history?projectId=${projectId}`);
  if (!res.ok) return [];
  const j = await res.json();
  return (j.history ?? []) as { id: string; title: string; time: string; status: string; active: boolean }[];
}

async function fetchChatPrompts(projectId: number) {
  const res = await fetch(`/api/chat/prompts?projectId=${projectId}`);
  if (!res.ok) return null;
  const j = await res.json();
  return (j.prompts ?? null) as string[] | null;
}

const THINKING_STEPS: AgentStreamItem[] = [
  { type: "action", tool: "analysis.think", content: "Analyzing request and planning steps",        status: "pending", group_id: "grp_1" },
  { type: "action", tool: "file.read",      content: "Reading codebase",                            status: "pending", group_id: "grp_1", meta: { file: "src/App.tsx · src/components/ · shared/schema.ts" } },
  { type: "action", tool: "file.write",     content: "Writing code",                                status: "pending", group_id: "grp_1", meta: { logs: "Created  src/components/Feature.tsx\nUpdated  src/App.tsx\nUpdated  src/index.css" } },
  { type: "action", tool: "console.run",    content: "Running build commands",                      status: "pending", group_id: "grp_1", meta: { logs: "$ npm install\n$ npm run build\n✓ Build succeeded" } },
  { type: "action", tool: "preview.open",   content: "Verifying preview",                           status: "pending", group_id: "grp_1", meta: { logs: "Checking app renders on port 5000…\n✓ Preview looks good" } },
  { type: "state",  content: "Server running on localhost:5000", icon: "🟢" },
  { type: "result", content: "All changes applied successfully.", status: "done" },
];

/* ─────────────────────────── Props ─────────────────────────────── */

interface ChatPanelProps {
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  currentAction?: AgentStreamItem | null;
  /** Open a file in the center editor (path is workspace-relative). */
  onOpenFile?: (path: string, content: string, lang: string) => void;
}

/* ─────────────────────────── Component ─────────────────────────── */

export function ChatPanel({ inputRef, currentAction, onOpenFile }: ChatPanelProps) {
  const handleOpenFile = async (path: string) => {
    if (!onOpenFile) {
      // No host handler — fall back to opening through inventory action so
      // the bus event still fires for other panels.
      await fetchFileContent(path);
      return;
    }
    const { content, lang } = await fetchFileContent(path);
    onOpenFile(path, content, lang || guessLangFromPath(path));
  };

  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]           = useState("");
  const [showChatAddPopup, setShowChatAddPopup] = useState(false);
  const [showNewChatScreen, setShowNewChatScreen] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel]   = useState(false);
  const [isAgentTyping, setIsAgentTyping]   = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [activeAction, setActiveAction]     = useState<AgentStreamItem | null>(null);

  const checkpointCountRef  = useRef(0);
  const internalInputRef    = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef      = useRef<HTMLDivElement>(null);
  const chatAddPopupRef     = useRef<HTMLDivElement>(null);
  const thinkingTimersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const agentStreamRef      = useRef<EventSource | null>(null);
  const currentRunIdRef     = useRef<string | null>(null);

  const chatInputRef = (inputRef as React.RefObject<HTMLTextAreaElement>) ?? internalInputRef;
  const projectId = Number(window.localStorage.getItem("nura.projectId") || "1") || 1;

  /* ── Real chat history from backend ── */
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history", projectId],
    queryFn: () => fetchChatHistory(projectId),
    staleTime: 30_000,
  });
  const chatHistory = historyData ?? [];

  /* ── Real suggested prompts from backend ── */
  const { data: promptsData } = useQuery({
    queryKey: ["/api/chat/prompts", projectId],
    queryFn: () => fetchChatPrompts(projectId),
    staleTime: 60_000,
  });
  const suggestedPrompts = promptsData ?? [
    "Check my app for bugs",
    "Add user authentication",
    "Connect a database",
    "Add payment processing",
    "Write tests for my code",
    "Add dark mode",
  ];

  /* ── Answer a pending agent_question — POST to backend → unblocks agent loop ── */
  const handleAnswer = useCallback(async (questionId: string, runId: string, answer: string) => {
    try {
      await fetch("/api/chat/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, questionId, answer }),
      });
    } catch (e) {
      console.warn("[question] failed to POST answer:", e);
    }
    // Mark the question as answered locally so options become read-only
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "question" && m.question.questionId === questionId
          ? { ...m, question: { ...m.question, answered: answer } }
          : m,
      ),
    );
  }, []);

  /* ── sync external action stream (WebSocket / props) ── */
  useEffect(() => {
    if (currentAction === undefined) return;
    setActiveAction(currentAction);
    if (currentAction) {
      setIsAgentThinking(true);
    } else {
      setIsAgentThinking(false);
    }
  }, [currentAction]);

  /* ── scroll ── */
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isAgentThinking]);

  /* ── close add popup on outside click ── */
  useEffect(() => {
    if (!showChatAddPopup) return;
    const handler = (e: MouseEvent) => {
      if (chatAddPopupRef.current && !chatAddPopupRef.current.contains(e.target as Node))
        setShowChatAddPopup(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showChatAddPopup]);

  /* ── stop agent ── */
  const stopAgent = () => {
    thinkingTimersRef.current.forEach(clearTimeout);
    thinkingTimersRef.current = [];
    if (agentStreamRef.current) {
      try { agentStreamRef.current.close(); } catch { /* ignore */ }
      agentStreamRef.current = null;
    }
    if (currentRunIdRef.current) {
      const rid = currentRunIdRef.current;
      currentRunIdRef.current = null;
      fetch(`/api/run/${rid}/cancel`, { method: "POST" }).catch(() => { /* ignore */ });
    }
    setIsAgentThinking(false);
    setIsAgentTyping(false);
    setActiveAction(null);
  };

  /* ── core agent runner — REAL backend call + SSE streaming ── */
  const runAgent = async (msg: string) => {
    setShowNewChatScreen(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const alreadyHasMsg = prev.length > 0 && last.role === "user" && (last as {role:"user";content:string;time:string}).content === msg;
      if (alreadyHasMsg) return prev;
      return [...prev, { role: "user", content: msg, time: "just now" }];
    });

    setIsAgentThinking(true);
    setActiveAction({ type: "action", tool: "analysis.think", content: "Connecting to agent…", status: "running" });

    // Resolve project id (default 1; backend lazy-creates if missing).
    const projectId = Number(window.localStorage.getItem("nura.projectId") || "1") || 1;
    const mode = getAgentMode();

    // 1) POST /api/run → get runId
    let runId: string;
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-project-id": String(projectId) },
        body: JSON.stringify({ projectId, goal: msg, mode }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error?.message || `HTTP ${r.status}`);
      }
      runId = j.data?.runId || j.data?.id;
      if (!runId) throw new Error("server did not return runId");
    } catch (e: any) {
      setIsAgentThinking(false);
      setActiveAction(null);
      setMessages((prev) => [...prev, {
        role: "agent",
        content: `⚠️ Couldn't reach the agent backend: \`${e?.message || e}\`.\n\nMake sure the API server is running and that \`OPENROUTER_API_KEY\` is set in Secrets.`,
        time: "just now",
      }]);
      return;
    }

    currentRunIdRef.current = runId;

    // 2) Open SSE stream for this run
    const es = new EventSource(`/api/agent/stream?runId=${encodeURIComponent(runId)}`);
    agentStreamRef.current = es;

    // ── per-tool action buffer (so we can fold start→complete into one tool_group entry) ──
    const inflight = new Map<string, AgentStreamItem>();

    const toolKey = (tool: string, phase?: string) => `${phase || ""}::${tool}`;

    const flushGroup = () => {
      if (inflight.size === 0) return;
      const actions = Array.from(inflight.values());
      inflight.clear();
      setMessages((prev) => [...prev, { role: "tool_group", time: "just now", actions }]);
    };

    es.addEventListener("agent", (ev) => {
      try {
        const e = JSON.parse((ev as MessageEvent).data) as {
          eventType: string;
          phase?: string;
          agentName?: string;
          payload?: any;
        };

        switch (e.eventType) {
          case "agent.thinking": {
            setIsAgentThinking(true);
            setActiveAction({
              type: "action",
              tool: "analysis.think",
              content: e.payload?.text || `Thinking${e.agentName ? ` (${e.agentName})` : ""}…`,
              status: "running",
            });
            break;
          }
          case "agent.tool_call": {
            const tool = e.payload?.tool || "tool.call";
            const k = toolKey(tool, e.phase);
            const item: AgentStreamItem = {
              type: "action",
              tool,
              content: e.payload?.label || tool.replace(/\./g, " "),
              status: "running",
              meta: e.payload?.args ? { logs: JSON.stringify(e.payload.args, null, 2).slice(0, 600) } : undefined,
            };
            inflight.set(k, item);
            setActiveAction(item);
            break;
          }
          case "phase.started": {
            const tool = `phase.${e.phase || "step"}`;
            const k = toolKey(tool);
            const item: AgentStreamItem = {
              type: "action",
              tool,
              content: e.payload?.label || `Phase: ${e.phase || "step"}`,
              status: "running",
            };
            inflight.set(k, item);
            setActiveAction(item);
            break;
          }
          case "phase.completed": {
            const tool = `phase.${e.phase || "step"}`;
            const k = toolKey(tool);
            const cur = inflight.get(k);
            if (cur) {
              const done: AgentStreamItem = {
                ...cur,
                status: "done",
                meta: e.payload ? { logs: typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload, null, 2).slice(0, 600) } : cur.meta,
              };
              inflight.set(k, done);
            }
            setActiveAction(null);
            break;
          }
          case "phase.failed": {
            const tool = `phase.${e.phase || "step"}`;
            const k = toolKey(tool);
            const cur = inflight.get(k);
            const failed: AgentStreamItem = {
              type: "action",
              tool,
              content: cur?.content || `Phase ${e.phase || ""} failed`,
              status: "error",
              meta: { logs: String(e.payload?.error || "failed") },
            };
            inflight.set(k, failed);
            setActiveAction(null);
            break;
          }
          case "file.written": {
            const path = e.payload?.path || "(file)";
            const item: AgentStreamItem = {
              type: "action",
              tool: "file.write",
              content: `Wrote ${path}`,
              status: "done",
              meta: { file: path },
            };
            inflight.set(`file::${path}`, item);
            break;
          }
          case "diff.queued": {
            const path = e.payload?.path || e.payload?.filePath || "(patch)";
            const item: AgentStreamItem = {
              type: "action",
              tool: "patch.queue",
              content: `Queued patch for ${path}`,
              status: "done",
              meta: { file: path },
            };
            inflight.set(`diff::${path}::${Date.now()}`, item);
            break;
          }
          case "file.diff": {
            // Flush current tool group first so diff card appears after the write chip
            if (inflight.size > 0) {
              const actions = Array.from(inflight.values());
              inflight.clear();
              setMessages((prev) => [...prev, { role: "tool_group", time: "just now", actions }]);
            }
            const diff = e.payload?.diff;
            if (diff) {
              setMessages((prev) => [...prev, { role: "diff", diffs: [diff], time: "just now" }]);
            }
            break;
          }
          case "agent.question": {
            // Flush in-flight tools before showing the question card
            flushGroup();
            setIsAgentThinking(false);
            setActiveAction(null);
            const { text, options, questionId } = e.payload ?? {};
            if (text && Array.isArray(options) && questionId) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "question" as const,
                  time: "just now",
                  question: {
                    text,
                    options,
                    questionId,
                    runId: currentRunIdRef.current ?? "",
                  },
                },
              ]);
            }
            break;
          }
          case "agent.message": {
            // Flush any pending tool group before the message
            flushGroup();
            setIsAgentTyping(false);
            setActiveAction(null);
            const text = typeof e.payload === "string" ? e.payload : (e.payload?.text || JSON.stringify(e.payload));
            if (text) {
              setMessages((prev) => [...prev, { role: "agent", content: text, time: "just now" }]);
            }
            break;
          }
        }
      } catch {
        /* ignore malformed events */
      }
    });

    es.addEventListener("lifecycle", (ev) => {
      try {
        const e = JSON.parse((ev as MessageEvent).data) as { status: string };
        if (e.status === "completed" || e.status === "failed" || e.status === "cancelled") {
          flushGroup();
          es.close();
          agentStreamRef.current = null;
          currentRunIdRef.current = null;
          setIsAgentThinking(false);
          setIsAgentTyping(false);
          setActiveAction(null);

          checkpointCountRef.current += 1;
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const summary =
            e.status === "completed"
              ? `Done — finished **"${msg}"**.`
              : e.status === "cancelled"
              ? `Cancelled.`
              : `Run failed. Check the console for details.`;
          setMessages((prev) => [
            ...prev,
            { role: "agent", content: summary, time: "just now" },
            ...(e.status === "completed"
              ? [{
                  role: "checkpoint" as const,
                  time: timeStr,
                  checkpoint: {
                    checkpointId: `cp-${Date.now()}`,
                    label: msg.length > 60 ? msg.slice(0, 60) + "…" : msg,
                    description: `After: ${msg.length > 40 ? msg.slice(0, 40) + "…" : msg}`,
                    time: timeStr,
                    filesChanged: 0,
                  },
                }]
              : []),
          ]);
        }
      } catch {
        /* ignore */
      }
    });

    es.onerror = () => {
      // Browser auto-reconnects; only surface if still in early state.
      if (es.readyState === EventSource.CLOSED) {
        agentStreamRef.current = null;
      }
    };
  };

  /* ── initial URL prompt — auto-start agent after intro ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt") || "";
    if (prompt) {
      const t = setTimeout(() => runAgent(prompt), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  /* ── send message from chat input ── */
  const handleSend = () => {
    if (!chatInput.trim() || isAgentThinking || isAgentTyping) return;
    const msg = chatInput.trim();
    setChatInput("");
    runAgent(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ─────────────────────────── Render ────────────────────────── */

  return (
    <div
      className="flex flex-col h-full min-h-0 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.015)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c8dff 0%, #a78bfa 100%)",
              boxShadow: "0 0 8px rgba(124,141,255,0.45)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Agent</span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.6)" }}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowHistoryPanel((v) => !v); setShowNewChatScreen(false); }}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-lg transition-all",
              showHistoryPanel
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            data-testid="button-chat-history"
            title="Chat history"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setShowNewChatScreen(true); setShowHistoryPanel(false); setMessages([]); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            data-testid="button-new-chat"
            title="New chat with Agent"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── History panel ── */}
      {showHistoryPanel && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chat History</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {chatHistory.length === 0 && (
              <p className="text-[11px] text-muted-foreground px-4 py-3">No previous chats yet.</p>
            )}
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setShowHistoryPanel(false)}
                data-testid={`button-history-chat-${chat.id}`}
                className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-white/4 transition-colors group relative"
                style={chat.active ? { background: "rgba(124,141,255,0.07)" } : {}}
                onMouseEnter={(e) => { if (!chat.active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!chat.active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {chat.active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: "linear-gradient(135deg, #7c8dff 0%, #a78bfa 100%)" }}
                  />
                )}
                <p
                  className="text-[12px] leading-snug line-clamp-2 pr-2"
                  style={{ color: chat.active ? "rgba(226,232,240,0.95)" : "rgba(226,232,240,0.7)" }}
                >
                  {chat.title}
                </p>
                <p className="text-[10px]" style={{ color: "rgba(100,116,139,0.55)" }}>{chat.time}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className={cn("flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0", showHistoryPanel && "hidden")}>

        {/* New chat screen */}
        {showNewChatScreen && (
          <div className="flex flex-col items-center justify-center flex-1 h-full gap-5 text-center px-2 py-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(124,141,255,0.08)", border: "1px solid rgba(124,141,255,0.18)" }}
            >
              <MessageSquarePlus className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">New chat with Agent</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed px-2">
                Agent can make changes, review its work, and debug itself automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setChatInput(prompt); setShowNewChatScreen(false); setTimeout(() => chatInputRef.current?.focus(), 50); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] text-white/75 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  data-testid={`button-new-chat-prompt-${prompt.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {!showNewChatScreen && messages.map((msg, i) => {
          if (msg.role === "checkpoint") {
            const cpNumber = messages.slice(0, i + 1).filter((m) => m.role === "checkpoint").length;
            const isLatest = messages.slice(i + 1).every((m) => m.role !== "checkpoint");
            return <CheckpointCard key={i} data={msg.checkpoint} checkpointNumber={cpNumber} isLatest={isLatest} />;
          }
          if (msg.role === "diff") {
            return (
              <div key={i} className="flex flex-col gap-2" data-testid={`diff-group-${i}`}>
                {msg.diffs.map((diff, j) => <FileDiffCard key={j} diff={diff} />)}
              </div>
            );
          }
          if (msg.role === "question") {
            return (
              <QuestionCard
                key={i}
                data={msg.question}
                onAnswer={handleAnswer}
              />
            );
          }
          if (msg.role === "tool_group") {
            return <ToolGroupLine key={i} actions={msg.actions} onOpenFile={handleOpenFile} />;
          }
          return (
            <div key={i} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div
                className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                style={msg.role === "agent"
                  ? { background: "linear-gradient(135deg, #7c8dff 0%, #a78bfa 100%)" }
                  : { background: "rgba(255,255,255,0.1)" }
                }
              >
                {msg.role === "agent" ? <Bot className="h-3 w-3 text-white" /> : <span className="text-foreground">U</span>}
              </div>
              {msg.role === "agent" ? (
                <div className="flex-1 min-w-0 py-0.5" data-testid={`message-agent-${i}`}>
                  <AgentMarkdown content={msg.content} />
                </div>
              ) : (
                <div
                  className="max-w-[82%] px-3 py-2 rounded-2xl text-[11.5px] leading-relaxed"
                  style={{
                    background: "rgba(124,141,255,0.18)",
                    border: "1px solid rgba(124,141,255,0.28)",
                    color: "rgba(226,232,240,1)",
                  }}
                  data-testid={`message-user-${i}`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking bubble — shown when agent is analyzing/planning */}
        {activeAction && activeAction.tool === "analysis.think" && !isAgentTyping && (
          <ThinkingBubble />
        )}

        {/* Working bubble — shown while non-think tools are running */}
        {activeAction && activeAction.tool !== "analysis.think" && !isAgentTyping && (
          <LiveActionBar action={activeAction} />
        )}

        {/* Responding indicator */}
        {isAgentTyping && (
          <div className="flex gap-2 items-start" data-testid="agent-typing-indicator">
            <style>{`
              @keyframes typing-bounce {
                0%, 60%, 100% { transform: translateY(0) scale(0.7); opacity: 0.35; }
                30%           { transform: translateY(-4px) scale(1); opacity: 1; }
              }
              .typing-dot-1 { animation: typing-bounce 1.1s ease-in-out infinite; animation-delay: 0ms; }
              .typing-dot-2 { animation: typing-bounce 1.1s ease-in-out infinite; animation-delay: 160ms; }
              .typing-dot-3 { animation: typing-bounce 1.1s ease-in-out infinite; animation-delay: 320ms; }
              @keyframes typing-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
              .typing-wrapper { animation: typing-fade-in 0.2s cubic-bezier(0.22,1,0.36,1) both; }
            `}</style>
            <div
              className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: "linear-gradient(135deg, #7c8dff 0%, #a78bfa 100%)", boxShadow: "0 0 10px rgba(124,141,255,0.35)" }}
            >
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <div
              className="typing-wrapper flex flex-col gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
              style={{ background: "rgba(124,141,255,0.07)", border: "1px solid rgba(124,141,255,0.2)" }}
            >
              <span className="text-[11px] font-semibold" style={{ color: "rgba(167,139,250,0.95)" }}>Responding</span>
              <div className="flex items-center gap-[4px]">
                <span className="typing-dot-1 w-[5px] h-[5px] rounded-full block" style={{ background: "rgba(167,139,250,0.9)" }} />
                <span className="typing-dot-2 w-[5px] h-[5px] rounded-full block" style={{ background: "rgba(167,139,250,0.9)" }} />
                <span className="typing-dot-3 w-[5px] h-[5px] rounded-full block" style={{ background: "rgba(167,139,250,0.9)" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div
        className={cn("p-3 border-t flex-shrink-0", showHistoryPanel && "hidden")}
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="rounded-xl transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: (isAgentThinking || isAgentTyping)
              ? "1px solid rgba(124,141,255,0.4)"
              : "1px solid rgba(255,255,255,0.09)",
            boxShadow: (isAgentThinking || isAgentTyping)
              ? "0 0 0 3px rgba(124,141,255,0.08), 0 4px 20px rgba(0,0,0,0.2)"
              : "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <textarea
            ref={chatInputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAgentThinking ? "Agent is working…" :
              isAgentTyping   ? "Agent is responding…" :
              "Make, test, iterate..."
            }
            disabled={isAgentThinking || isAgentTyping}
            rows={1}
            className="w-full bg-transparent px-3 pt-3 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: 42, maxHeight: 120 }}
            data-testid="input-chat"
          />

          <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <div ref={chatAddPopupRef} className="relative">
                <button
                  onClick={() => setShowChatAddPopup((v) => !v)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
                  data-testid="button-chat-add"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {showChatAddPopup && (
                  <div
                    className="absolute bottom-full left-0 mb-2 z-50 overflow-hidden"
                    style={{
                      width: 175,
                      background: "rgba(13,13,28,0.98)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      boxShadow: "0 -4px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    <label
                      data-testid="button-chat-popup-upload-file"
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs text-white/75 hover:bg-white/6 hover:text-white transition-colors cursor-pointer"
                      onClick={() => setShowChatAddPopup(false)}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.zip,.tar,.gz,.txt,.csv,.json,.md,application/pdf,application/zip,text/*"
                        className="hidden"
                      />
                      <Paperclip className="h-3.5 w-3.5 text-[#7c8dff] flex-shrink-0" />
                      <span>Upload File</span>
                    </label>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />
                    <label
                      data-testid="button-chat-popup-upload-photo"
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs text-white/75 hover:bg-white/6 hover:text-white transition-colors cursor-pointer"
                      onClick={() => setShowChatAddPopup(false)}
                    >
                      <input type="file" accept="image/*" multiple className="hidden" />
                      <ImageIcon className="h-3.5 w-3.5 text-[#a78bfa] flex-shrink-0" />
                      <span>Upload Photo</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {!isAgentThinking && !isAgentTyping && <AgentsButton size="sm" />}
              {(isAgentThinking || isAgentTyping) ? (
                <button
                  onClick={stopAgent}
                  className="flex items-center gap-1 px-2 h-6 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-80 active:scale-95"
                  style={{ background: "rgba(239,68,68,0.85)", boxShadow: "0 0 10px rgba(239,68,68,0.4)" }}
                  data-testid="button-stop-agent-input"
                >
                  <div className="w-2 h-2 rounded-sm bg-white flex-shrink-0" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!chatInput.trim()}
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200",
                    chatInput.trim()
                      ? "text-white hover:opacity-90"
                      : "bg-white/5 text-muted-foreground/50 cursor-not-allowed"
                  )}
                  style={chatInput.trim() ? {
                    background: "linear-gradient(135deg, #7c8dff 0%, #a78bfa 100%)",
                    boxShadow: "0 0 12px rgba(124,141,255,0.4)",
                  } : {}}
                  data-testid="button-chat-send"
                >
                  <Send className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
