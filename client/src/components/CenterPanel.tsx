import { useState, useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import {
  Eye, Database, Terminal, Globe, X, Plus, GitBranch,
  Code2, FileJson, FileType2, Palette, ImageIcon, File,
  FileText, Settings2, WrapText, AlignLeft, Lock, ChevronDown,
  Upload, CheckCircle,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { cn } from "@/lib/utils";
import Preview from "@/pages/preview";
import { DatabasePanel } from "@/components/DatabasePanel";
import { ConsolePanel } from "@/components/console";
import { PublishingPanel, AuthPanel } from "@/components/PublishingPanel";
import { FileTreePanel } from "@/components/FileTreePanel";

/* ─────────────────────────── Types ─────────────────────────────── */

export type WorkspaceTab = {
  id: number;
  label: string;
  url?: string;
  fileContent?: string;
  fileLang?: string;
};

/* ─────────────────────────── Tab icon helpers ───────────────────── */

function fileTabIcon(label: string, lang?: string): React.ReactElement {
  const name = label.toLowerCase();
  if (lang === "css"  || name.endsWith(".css"))  return <Palette     style={{ width: 11, height: 11, color: "#f472b6" }} />;
  if (lang === "html" || name.endsWith(".html")) return <Globe       style={{ width: 11, height: 11, color: "#fb923c" }} />;
  if (lang === "json" || name.endsWith(".json")) return <FileJson    style={{ width: 11, height: 11, color: "#fbbf24" }} />;
  if (name.endsWith(".tsx") || name.endsWith(".jsx")) return <Code2  style={{ width: 11, height: 11, color: "#60a5fa" }} />;
  if (name.endsWith(".ts")  || name.endsWith(".js"))  return <FileType2 style={{ width: 11, height: 11, color: "#34d399" }} />;
  if (name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/))   return <ImageIcon style={{ width: 11, height: 11, color: "#c084fc" }} />;
  if (name.endsWith(".md"))    return <FileText  style={{ width: 11, height: 11, color: "#94a3b8" }} />;
  if (name.startsWith(".env")) return <Settings2 style={{ width: 11, height: 11, color: "#a3e635" }} />;
  return <File style={{ width: 11, height: 11, color: "#64748b" }} />;
}

function urlTabIcon(url: string): React.ReactElement {
  if (url === "/preview")        return <Eye        style={{ width: 11, height: 11, color: "#60a5fa" }} />;
  if (url === "__database__")    return <Database   style={{ width: 11, height: 11, color: "#34d399" }} />;
  if (url === "__console__")     return <Terminal   style={{ width: 11, height: 11, color: "#fbbf24" }} />;
  if (url === "__publishing__")  return <Globe      style={{ width: 11, height: 11, color: "#4ade80" }} />;
  if (url === "__auth__")        return <Lock       style={{ width: 11, height: 11, color: "#a78bfa" }} />;
  if (url === "__git__")         return <GitBranch  style={{ width: 11, height: 11, color: "#86efac" }} />;
  return <Globe style={{ width: 11, height: 11, color: "#94a3b8" }} />;
}

function tabIcon(tab: WorkspaceTab): React.ReactElement {
  if (tab.fileContent !== undefined) return fileTabIcon(tab.label, tab.fileLang);
  if (tab.url) return urlTabIcon(tab.url);
  return <File style={{ width: 11, height: 11, color: "#64748b" }} />;
}

/* ─────────────────────────── Language display ───────────────────── */

function langDisplayName(lang?: string): string {
  const map: Record<string, string> = {
    typescript: "TypeScript", javascript: "JavaScript",
    css: "CSS", html: "HTML", json: "JSON",
    plaintext: "Plain Text", markdown: "Markdown",
    python: "Python", rust: "Rust", go: "Go",
  };
  return lang ? (map[lang] ?? lang) : "Plain Text";
}

/* ─────────────────────────── Tool items ────────────────────────── */

const toolItems = [
  {
    section: "Your App",
    items: [
      { id: "preview",    label: "Preview",    sub: "Live preview of your app in real time",                 icon: Eye,       color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   url: "/preview"       },
      { id: "database",   label: "Database",   sub: "Manage tables, rows, and run queries",                  icon: Database,  color: "#34d399", bg: "rgba(52,211,153,0.1)",   url: "__database__"   },
      { id: "console",    label: "Console",    sub: "Run commands and view server logs",                     icon: Terminal,  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   url: "__console__"    },
      { id: "git",        label: "Git",        sub: "Version history, branches, and commits",                icon: GitBranch, color: "#86efac", bg: "rgba(134,239,172,0.1)", url: "__git__"        },
    ],
  },
  {
    section: "Deployment",
    items: [
      { id: "publishing", label: "Publishing", sub: "Publish a live, stable, public version of your app",   icon: Globe,     color: "#4ade80", bg: "rgba(74,222,128,0.1)",   url: "__publishing__" },
    ],
  },
];

/* ─────────────────────────── Props ─────────────────────────────── */

interface CenterPanelProps {
  tabs: WorkspaceTab[];
  activeTabId: number;
  setActiveTabId: (id: number) => void;
  addTab: () => void;
  closeTab: (id: number) => void;
  addToolTab: (label: string, url: string) => void;
  openFileTab: (name: string, content: string, lang: string) => void;
  showFileExplorer: boolean;
  setShowFileExplorer: (v: boolean) => void;
  activeFileName: string;
}

/* ─────────────────────────── Editor Toolbar ─────────────────────── */

interface EditorToolbarProps {
  label: string;
  lang?: string;
  modified: boolean;
  wordWrap: boolean;
  line: number;
  col: number;
  onToggleWrap: () => void;
  onFormat: () => void;
}

function EditorToolbar({ label, lang, modified, wordWrap, line, col, onToggleWrap, onFormat }: EditorToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-3 flex-shrink-0"
      style={{
        height: 30,
        background: "rgba(255,255,255,0.018)",
        borderBottom: "1px solid rgba(255,255,255,0.065)",
      }}
    >
      {/* Left: icon + filename + unsaved dot */}
      <div className="flex items-center gap-1.5 min-w-0">
        {fileTabIcon(label, lang)}
        <span className="text-[11px] font-medium truncate" style={{ color: "rgba(203,213,225,0.7)" }}>
          {label}
        </span>
        {modified && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "#fbbf24", boxShadow: "0 0 4px rgba(251,191,36,0.55)" }}
            title="Unsaved changes"
          />
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToolbarBtn onClick={onFormat} title="Format document" data-testid="button-format">
          <AlignLeft style={{ width: 10, height: 10 }} />
          Format
        </ToolbarBtn>
        <ToolbarBtn
          onClick={onToggleWrap}
          active={wordWrap}
          title="Toggle word wrap"
          data-testid="button-word-wrap"
        >
          <WrapText style={{ width: 10, height: 10 }} />
          Wrap
        </ToolbarBtn>
        <span className="mx-1" style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)", display: "inline-block" }} />
        <span className="text-[10px] px-1.5" style={{ color: "rgba(100,116,139,0.55)", fontVariantNumeric: "tabular-nums" }}>
          {langDisplayName(lang)}
        </span>
        <span className="text-[10px] px-1.5" style={{ color: "rgba(100,116,139,0.45)", fontVariantNumeric: "tabular-nums" }}>
          Ln {line}:{col}
        </span>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children, onClick, title, active = false,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  "data-testid"?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-testid={testId}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors"
      style={{
        background: active ? "rgba(124,141,255,0.12)" : "transparent",
        color: active ? "#a78bfa" : "rgba(148,163,184,0.5)",
        border: active ? "1px solid rgba(124,141,255,0.2)" : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
          (e.currentTarget as HTMLElement).style.color = "rgba(226,232,240,0.75)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "rgba(148,163,184,0.5)";
        }
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────── Git Panel ─────────────────────────── */

const MOCK_BRANCHES = ["main", "dev", "feature/ui-update", "fix/auth-bug"];
const MOCK_REPOS = ["mohd/nura-x", "mohd/agent-app", "mohd/portfolio"];

function GitPanel() {
  const [githubConnected, setGithubConnected] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showRepos, setShowRepos] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [pushState, setPushState] = useState<"idle" | "pushing" | "done">("idle");

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setGithubConnected(true); }, 1800);
  };

  const handlePush = () => {
    if (!commitMsg.trim()) return;
    setPushState("pushing");
    setTimeout(() => {
      setPushState("done");
      setTimeout(() => { setPushState("idle"); setCommitMsg(""); }, 2500);
    }, 2000);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: "rgba(10,12,22,0.6)", animation: "git-fadein 0.2s ease" }}
    >
      <style>{`@keyframes git-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <GitBranch style={{ width: 13, height: 13, color: "#86efac" }} />
        <span className="text-xs font-semibold" style={{ color: "rgba(226,232,240,0.8)" }}>
          Version Control
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>

        {githubConnected ? (
          <>
            {/* Branch & Repo buttons */}
            <div className="flex gap-2">
              {/* Branch button */}
              <div className="relative flex-1">
                <button
                  onClick={() => { setShowBranches(v => !v); setShowRepos(false); }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: showBranches ? "rgba(134,239,172,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${showBranches ? "rgba(134,239,172,0.3)" : "rgba(255,255,255,0.08)"}`,
                    color: "#86efac",
                  }}
                >
                  <GitBranch style={{ width: 11, height: 11 }} />
                  <span className="truncate flex-1 text-left">{selectedBranch}</span>
                  <ChevronDown style={{ width: 10, height: 10, opacity: 0.6 }} />
                </button>
                {showBranches && (
                  <div
                    className="absolute left-0 top-full mt-1 w-full rounded-lg overflow-hidden z-50"
                    style={{ background: "rgba(15,18,32,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  >
                    {MOCK_BRANCHES.map(b => (
                      <button
                        key={b}
                        onClick={() => { setSelectedBranch(b); setShowBranches(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/5 text-left"
                        style={{ color: b === selectedBranch ? "#86efac" : "rgba(203,213,225,0.75)" }}
                      >
                        <GitBranch style={{ width: 10, height: 10, opacity: 0.6 }} />
                        {b}
                        {b === selectedBranch && <span className="ml-auto text-[9px]" style={{ color: "#86efac" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Repo button */}
              <div className="relative flex-1">
                <button
                  onClick={() => { setShowRepos(v => !v); setShowBranches(false); }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: showRepos ? "rgba(124,141,255,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${showRepos ? "rgba(124,141,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                    color: "#a78bfa",
                  }}
                >
                  <FaGithub style={{ width: 11, height: 11 }} />
                  <span className="truncate flex-1 text-left">{selectedRepo ? selectedRepo.split("/")[1] : "Repo"}</span>
                  <ChevronDown style={{ width: 10, height: 10, opacity: 0.6 }} />
                </button>
                {showRepos && (
                  <div
                    className="absolute left-0 top-full mt-1 w-full rounded-lg overflow-hidden z-50"
                    style={{ background: "rgba(15,18,32,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  >
                    {MOCK_REPOS.map(r => (
                      <button
                        key={r}
                        onClick={() => { setSelectedRepo(r); setShowRepos(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/5 text-left"
                        style={{ color: r === selectedRepo ? "#a78bfa" : "rgba(203,213,225,0.75)" }}
                      >
                        <FaGithub style={{ width: 10, height: 10, opacity: 0.6 }} />
                        {r}
                        {r === selectedRepo && <span className="ml-auto text-[9px]" style={{ color: "#a78bfa" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Push Commit section */}
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.4)" }}>
                Push Commit
              </p>

              {/* Commit message input */}
              <textarea
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                placeholder="Write a commit message…"
                rows={3}
                disabled={pushState !== "idle"}
                className="w-full rounded-lg px-3 py-2 text-[11.5px] resize-none outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${commitMsg.trim() ? "rgba(124,141,255,0.25)" : "rgba(255,255,255,0.07)"}`,
                  color: "rgba(226,232,240,0.85)",
                  opacity: pushState !== "idle" ? 0.5 : 1,
                }}
              />

              {/* Target info */}
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                <Upload style={{ width: 9, height: 9 }} />
                <span>Push to</span>
                <span style={{ color: "#86efac" }}>{selectedBranch}</span>
                {selectedRepo && (
                  <>
                    <span>·</span>
                    <FaGithub style={{ width: 9, height: 9 }} />
                    <span style={{ color: "#a78bfa" }}>{selectedRepo}</span>
                  </>
                )}
              </div>

              {/* Push button */}
              <button
                onClick={handlePush}
                disabled={!commitMsg.trim() || pushState !== "idle"}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{
                  background:
                    pushState === "done"
                      ? "rgba(74,222,128,0.15)"
                      : commitMsg.trim() && pushState === "idle"
                        ? "linear-gradient(135deg,#7c8dff,#a78bfa)"
                        : "rgba(255,255,255,0.05)",
                  color:
                    pushState === "done"
                      ? "#4ade80"
                      : commitMsg.trim() && pushState === "idle"
                        ? "#fff"
                        : "rgba(148,163,184,0.3)",
                  cursor: commitMsg.trim() && pushState === "idle" ? "pointer" : "not-allowed",
                  border: pushState === "done" ? "1px solid rgba(74,222,128,0.3)" : "none",
                }}
              >
                {pushState === "done" ? (
                  <><CheckCircle style={{ width: 13, height: 13 }} /> Pushed successfully!</>
                ) : pushState === "pushing" ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Pushing…</>
                ) : (
                  <><Upload style={{ width: 13, height: 13 }} /> Push Commit</>
                )}
              </button>
            </div>

            {/* Empty changes state */}
            <div className="flex flex-col items-center justify-center py-4 gap-1.5">
              <GitBranch style={{ width: 20, height: 20, color: "rgba(148,163,184,0.15)" }} />
              <p className="text-[10.5px] text-center" style={{ color: "rgba(148,163,184,0.35)" }}>
                No staged or changed files
              </p>
            </div>
          </>
        ) : (
          /* GitHub not connected */
          <div className="flex flex-col items-center justify-center py-10 gap-4 px-2">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <FaGithub style={{ width: 28, height: 28, color: "rgba(226,232,240,0.7)" }} />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-semibold mb-1" style={{ color: "rgba(226,232,240,0.85)" }}>
                Connect with GitHub
              </p>
              <p className="text-[10.5px]" style={{ color: "rgba(148,163,184,0.45)" }}>
                Login to view branches, repos and sync your code
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: connecting ? "rgba(255,255,255,0.05)" : "rgba(226,232,240,0.9)",
                color: connecting ? "rgba(148,163,184,0.5)" : "#0d1117",
                cursor: connecting ? "not-allowed" : "pointer",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <FaGithub style={{ width: 14, height: 14 }} />
              {connecting ? "Connecting…" : "Login with GitHub"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Bottom status bar ──────────────────── */

function StatusBar({ lang, modified, line, col }: { lang?: string; modified: boolean; line: number; col: number }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-3"
      style={{
        height: 22,
        background: "rgba(124,141,255,0.06)",
        borderTop: "1px solid rgba(124,141,255,0.1)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>{langDisplayName(lang)}</span>
        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.3)" }}>UTF-8</span>
        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.3)" }}>LF</span>
        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.3)" }}>Spaces: 2</span>
      </div>
      <div className="flex items-center gap-3">
        {modified && (
          <span className="text-[10px]" style={{ color: "#fbbf24" }}>● Unsaved</span>
        )}
        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)", fontVariantNumeric: "tabular-nums" }}>
          Ln {line}, Col {col}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Component ────────────────────── */

export function CenterPanel({
  tabs,
  activeTabId,
  setActiveTabId,
  addTab,
  closeTab,
  addToolTab,
  openFileTab,
  showFileExplorer,
  setShowFileExplorer,
  activeFileName,
}: CenterPanelProps) {
  const [modifiedIds, setModifiedIds]   = useState<Set<number>>(new Set());
  const [wordWrap, setWordWrap]         = useState(true);
  const [cursorPos, setCursorPos]       = useState({ line: 1, col: 1 });
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const markModified = useCallback((id: number) => {
    setModifiedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
  }, []);

  const removeModified = useCallback((id: number) => {
    setModifiedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
  }, []);

  const handleFormat = useCallback(() => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, []);

  const toggleWrap = useCallback(() => {
    setWordWrap((w) => {
      const next = !w;
      editorRef.current?.updateOptions({ wordWrap: next ? "on" : "off" });
      return next;
    });
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isFileTab = activeTab?.fileContent !== undefined;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Tab bar ── */}
      <div
        className="flex items-center gap-0.5 px-3 border-b flex-shrink-0 overflow-x-auto"
        style={{
          height: 38,
          background: "rgba(255,255,255,0.01)",
          borderColor: "rgba(255,255,255,0.06)",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((tab) => {
          const isActive   = tab.id === activeTabId;
          const isModified = modifiedIds.has(tab.id);
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className="flex items-center gap-1.5 pl-2.5 pr-1 rounded-md border text-xs cursor-pointer transition-all flex-shrink-0 group"
              style={{
                height: 26,
                background: isActive ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.025)",
                borderColor: isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                color: isActive ? "rgba(226,232,240,0.9)" : "rgba(148,163,184,0.55)",
              }}
              data-testid={`tab-${tab.id}`}
            >
              {tabIcon(tab)}
              <span className="whitespace-nowrap text-[11.5px]">{tab.label}</span>
              {/* Modified dot / close */}
              <div className="w-4 h-4 flex items-center justify-center ml-0.5">
                {isModified ? (
                  <>
                    <span
                      className="group-hover:hidden w-1.5 h-1.5 rounded-full"
                      style={{ background: "#fbbf24" }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeModified(tab.id); closeTab(tab.id); }}
                      className="hidden group-hover:flex w-4 h-4 items-center justify-center rounded hover:bg-white/10 transition-colors"
                      data-testid={`button-close-tab-${tab.id}`}
                    >
                      <X style={{ width: 9, height: 9 }} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                    data-testid={`button-close-tab-${tab.id}`}
                  >
                    <X style={{ width: 9, height: 9 }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={addTab}
          className={cn(
            "flex items-center gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors flex-shrink-0",
            tabs.length > 0 ? "w-6 h-6 justify-center" : "px-2.5 h-7"
          )}
          data-testid="button-new-tab"
        >
          <Plus style={{ width: 12, height: 12 }} />
          {tabs.length === 0 && <span>Tools &amp; files</span>}
        </button>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Editor toolbar — shown only for file tabs */}
          {isFileTab && (
            <EditorToolbar
              label={activeTab!.label}
              lang={activeTab!.fileLang}
              modified={modifiedIds.has(activeTab!.id)}
              wordWrap={wordWrap}
              line={cursorPos.line}
              col={cursorPos.col}
              onToggleWrap={toggleWrap}
              onFormat={handleFormat}
            />
          )}

          {/* Main content */}
          <div className="flex-1 relative overflow-hidden">
            {(() => {
              /* Monaco editor (file tabs) */
              if (isFileTab) {
                return (
                  <div className="absolute inset-0">
                    <Editor
                      key={activeTab!.id}
                      defaultValue={activeTab!.fileContent}
                      language={activeTab!.fileLang ?? "typescript"}
                      theme="vs-dark"
                      onMount={handleMount}
                      onChange={() => markModified(activeTab!.id)}
                      options={{
                        fontSize: 13,
                        fontFamily: '"Fira Code","Cascadia Code","JetBrains Mono",monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        renderLineHighlight: "line",
                        padding: { top: 12, bottom: 12 },
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                        wordWrap: wordWrap ? "on" : "off",
                        tabSize: 2,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                );
              }

              /* Named panels */
              if (activeTab?.url === "/preview")        return <Preview />;
              if (activeTab?.url === "__database__")    return <DatabasePanel />;
              if (activeTab?.url === "__console__")     return <ConsolePanel />;
              if (activeTab?.url === "__publishing__")  return <PublishingPanel />;
              if (activeTab?.url === "__auth__")        return <AuthPanel onClose={() => closeTab(activeTabId)} />;
              if (activeTab?.url === "__git__")         return <GitPanel />;

              /* Generic iframe */
              if (activeTab?.url) {
                return (
                  <iframe
                    key={activeTab.url}
                    src={activeTab.url}
                    className="absolute inset-0 w-full h-full border-0"
                    title={activeTab.label}
                    data-testid={`iframe-tab-${activeTab.id}`}
                  />
                );
              }

              /* Empty state — Tools & files grid */
              return (
                <div className="absolute inset-0 overflow-y-auto" style={{ background: "rgba(255,255,255,0.006)" }}>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="relative py-8 px-6 w-full">
                    <div style={{ maxWidth: 700, margin: "0 auto" }}>
                      {toolItems.map((section) => (
                        <div key={section.section} className="mb-7">
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                            style={{ color: "rgba(148,163,184,0.38)" }}
                          >
                            {section.section}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => addToolTab(item.label, item.url)}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group transition-all duration-200"
                                  style={{
                                    background: "rgba(255,255,255,0.028)",
                                    border: "1px solid rgba(255,255,255,0.07)",
                                  }}
                                  onMouseEnter={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    el.style.border = "1px solid rgba(124,141,255,0.28)";
                                    el.style.background = "rgba(124,141,255,0.055)";
                                    el.style.transform = "translateY(-1px)";
                                    el.style.boxShadow = "0 4px 16px rgba(124,141,255,0.08)";
                                  }}
                                  onMouseLeave={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    el.style.border = "1px solid rgba(255,255,255,0.07)";
                                    el.style.background = "rgba(255,255,255,0.028)";
                                    el.style.transform = "translateY(0)";
                                    el.style.boxShadow = "none";
                                  }}
                                  data-testid={`button-newtab-tool-${item.id}`}
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: item.bg }}
                                  >
                                    <Icon style={{ width: 15, height: 15, color: item.color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors mb-0.5 truncate">
                                      {item.label}
                                    </p>
                                    <p className="text-[10.5px] leading-snug line-clamp-2" style={{ color: "rgba(148,163,184,0.48)" }}>
                                      {item.sub}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom status bar — file tabs only */}
          {isFileTab && (
            <StatusBar
              lang={activeTab!.fileLang}
              modified={modifiedIds.has(activeTab!.id)}
              line={cursorPos.line}
              col={cursorPos.col}
            />
          )}
        </div>

        {/* ── File Explorer side panel ── */}
        <div
          className="h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width: showFileExplorer ? 240 : 0,
            borderLeft: showFileExplorer ? "1px solid rgba(255,255,255,0.07)" : "none",
          }}
        >
          {showFileExplorer && (
            <FileTreePanel
              activeFileName={activeFileName}
              onFileOpen={(name, content, lang) => openFileTab(name, content, lang)}
              onClose={() => setShowFileExplorer(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
