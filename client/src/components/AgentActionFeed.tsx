import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolName =
  | "analysis.think"
  | "file.read" | "file.write" | "file.delete" | "file.create"
  | "console.run" | "shell.exec"
  | "package.install" | "package.remove"
  | "server.start" | "server.restart"
  | "db.push" | "db.migrate"
  | "git.clone" | "git.commit"
  | "deploy.publish"
  | "screenshot.capture"
  | "ui.render"
  | "preview.open"
  | "logs.stream"
  | "api.call"
  | "auth.login"
  | "webhook.trigger"
  | "search.web" | "search.code"
  | "env.read" | "env.write"
  | "debug.run" | "test.run" | "monitor.check";

export type StreamItemType = "message" | "action_group" | "action" | "result" | "state";
export type ActionStatus = "pending" | "running" | "done";

export interface AgentStreamItem {
  type: StreamItemType;
  content: string;
  tool?: ToolName;
  status?: ActionStatus;
  icon?: string;
  group_id?: string;
  meta?: {
    duration?: string;
    progress?: number;
    logs?: string;
    file?: string;
  };
}

export type AgentActionDef = AgentStreamItem;

const TOOL_META: Record<ToolName, { emoji: string; label: string; color: string }> = {
  "analysis.think":    { emoji: "🧠", label: "analysis.think",    color: "#a78bfa" },
  "file.read":         { emoji: "📁", label: "file.read",         color: "#7dd3fc" },
  "file.write":        { emoji: "📁", label: "file.write",        color: "#86efac" },
  "file.delete":       { emoji: "📁", label: "file.delete",       color: "#f87171" },
  "console.run":       { emoji: "💻", label: "console.run",       color: "#fbbf24" },
  "package.install":   { emoji: "📦", label: "package.install",   color: "#fb923c" },
  "package.remove":    { emoji: "📦", label: "package.remove",    color: "#fb923c" },
  "server.start":      { emoji: "🟢", label: "server.start",      color: "#4ade80" },
  "server.restart":    { emoji: "🔄", label: "server.restart",    color: "#fb923c" },
  "db.push":           { emoji: "🗄️", label: "db.push",           color: "#34d399" },
  "db.migrate":        { emoji: "🗄️", label: "db.migrate",        color: "#34d399" },
  "git.clone":         { emoji: "🌿", label: "git.clone",         color: "#86efac" },
  "git.commit":        { emoji: "🌿", label: "git.commit",        color: "#86efac" },
  "deploy.publish":    { emoji: "🚀", label: "deploy.publish",    color: "#60a5fa" },
  "screenshot.capture":{ emoji: "📸", label: "screenshot.capture",color: "#f472b6" },
  "ui.render":         { emoji: "🖥️", label: "ui.render",         color: "#c084fc" },
  "preview.open":      { emoji: "👁️", label: "preview.open",      color: "#f472b6" },
  "logs.stream":       { emoji: "📜", label: "logs.stream",       color: "#94a3b8" },
  "api.call":          { emoji: "🔗", label: "api.call",          color: "#38bdf8" },
  "auth.login":        { emoji: "🔐", label: "auth.login",        color: "#facc15" },
  "webhook.trigger":   { emoji: "📡", label: "webhook.trigger",   color: "#818cf8" },
  "search.web":        { emoji: "🔍", label: "search.web",        color: "#f97316" },
  "search.code":       { emoji: "🔎", label: "search.code",       color: "#22d3ee" },
  "env.read":          { emoji: "🔑", label: "env.read",          color: "#facc15" },
  "env.write":         { emoji: "🔑", label: "env.write",         color: "#fbbf24" },
  "shell.exec":        { emoji: "⚡", label: "shell.exec",        color: "#a3e635" },
  "file.create":       { emoji: "📄", label: "file.create",       color: "#86efac" },
  "debug.run":         { emoji: "🐛", label: "debug.run",         color: "#f87171" },
  "test.run":          { emoji: "🧪", label: "test.run",          color: "#34d399" },
  "monitor.check":     { emoji: "📊", label: "monitor.check",     color: "#a78bfa" },
};

const STYLES = `
  @keyframes aaf-spin { to { transform: rotate(360deg); } }
  @keyframes aaf-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes aaf-row-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  @keyframes aaf-dot-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity:0.4; }
    40% { transform: scale(1); opacity:1; }
  }
  .aaf-spin     { animation: aaf-spin  0.9s linear infinite; }
  .aaf-pulse    { animation: aaf-pulse 1.2s ease-in-out infinite; }
  .aaf-row-in   { animation: aaf-row-in 0.15s ease-out both; }
  .aaf-dot-1   { animation: aaf-dot-bounce 1.2s ease-in-out 0ms   infinite; }
  .aaf-dot-2   { animation: aaf-dot-bounce 1.2s ease-in-out 180ms infinite; }
  .aaf-dot-3   { animation: aaf-dot-bounce 1.2s ease-in-out 360ms infinite; }
`;

function StatusDot({ status, color }: { status: ActionStatus; color: string }) {
  if (status === "done") {
    return (
      <span className="text-[12px] leading-none" style={{ filter: "drop-shadow(0 0 4px rgba(74,222,128,0.6))" }}>✅</span>
    );
  }
  if (status === "running") {
    return (
      <span
        className="aaf-pulse inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
    );
  }
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0 border"
      style={{ borderColor: "rgba(255,255,255,0.15)", background: "transparent" }}
    />
  );
}

function ActionRow({
  item,
  index,
  total,
}: {
  item: AgentStreamItem;
  index: number;
  total: number;
}) {
  const tool = item.tool ?? "analysis.think";
  const meta = TOOL_META[tool] ?? TOOL_META["analysis.think"];
  const status = item.status ?? "pending";
  const isRunning = status === "running";
  const isDone = status === "done";
  const isPending = status === "pending";
  const isLast = index === total - 1;

  return (
    <div className="aaf-row-in flex items-stretch gap-0" data-testid={`action-row-${index}`}>
      {/* Timeline track */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32, paddingLeft: 12 }}>
        <div
          className="w-px flex-shrink-0"
          style={{
            height: 10,
            background: isPending ? "rgba(255,255,255,0.06)" : isDone ? "rgba(74,222,128,0.25)" : `${meta.color}50`,
          }}
        />
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: isPending ? "rgba(255,255,255,0.08)" : isDone ? "rgba(74,222,128,0.5)" : meta.color,
            boxShadow: isRunning ? `0 0 8px ${meta.color}70` : "none",
          }}
        />
        {!isLast && (
          <div
            className="w-px flex-1"
            style={{
              minHeight: 8,
              background: isPending ? "rgba(255,255,255,0.06)" : isDone ? "rgba(74,222,128,0.2)" : `${meta.color}40`,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 px-2 py-2"
        style={{
          background: isRunning ? `${meta.color}07` : "transparent",
          borderRadius: 8,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Emoji icon */}
          <span
            className={cn("text-[13px] leading-none flex-shrink-0", isRunning && "aaf-pulse")}
            style={{ opacity: isPending ? 0.25 : 1 }}
          >
            {meta.emoji}
          </span>

          {/* Tool chip */}
          <span
            className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: isPending ? "rgba(255,255,255,0.03)" : `${meta.color}14`,
              border: `1px solid ${isPending ? "rgba(255,255,255,0.07)" : meta.color + "30"}`,
              color: isPending ? "rgba(148,163,184,0.2)" : `${meta.color}cc`,
            }}
          >
            {meta.label}
          </span>

          {/* Content */}
          <span
            className="text-[11.5px] font-medium flex-1 min-w-0 truncate"
            style={{
              color: isPending
                ? "rgba(148,163,184,0.2)"
                : isDone
                  ? "rgba(148,163,184,0.55)"
                  : "rgba(226,232,240,0.95)",
            }}
          >
            {item.content}
          </span>

          {/* Status indicator */}
          <div className="flex-shrink-0 ml-auto">
            <StatusDot status={status} color={meta.color} />
          </div>
        </div>

        {/* Meta logs / file detail */}
        {!isPending && item.meta?.logs && (
          <div
            className="mt-1.5 rounded-md px-2.5 py-1.5 text-[9.5px] font-mono leading-relaxed"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${meta.color}18`,
              borderLeft: `2px solid ${meta.color}45`,
              color: isDone ? "rgba(148,163,184,0.5)" : "rgba(203,213,225,0.75)",
              whiteSpace: "pre-wrap",
            }}
          >
            {item.meta.logs}
          </div>
        )}
        {!isPending && item.meta?.file && (
          <div
            className="mt-1 text-[9.5px] font-mono"
            style={{ color: isDone ? "rgba(100,116,139,0.45)" : `${meta.color}99` }}
          >
            → {item.meta.file}
          </div>
        )}
      </div>
    </div>
  );
}

function StateRow({ item }: { item: AgentStreamItem }) {
  return (
    <div
      className="aaf-row-in flex items-center gap-2 px-3 py-2 mx-1 rounded-lg"
      style={{
        background: "rgba(74,222,128,0.05)",
        border: "1px solid rgba(74,222,128,0.15)",
      }}
    >
      <span className="text-[13px] leading-none">{item.icon ?? "🟢"}</span>
      <span className="text-[11px] font-medium" style={{ color: "rgba(134,239,172,0.85)" }}>
        {item.content}
      </span>
    </div>
  );
}

interface AgentActionFeedProps {
  steps: AgentStreamItem[];
  activeIdx: number;
  workingDots: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onStop: () => void;
}

export function AgentActionFeed({
  steps,
  activeIdx,
  workingDots,
  expanded,
  onToggleExpand,
  onStop,
}: AgentActionFeedProps) {
  const actionItems = steps.filter((s) => s.type === "action");
  const activeAction = actionItems.find((_, i) => i === activeIdx) ?? actionItems[0];
  const activeTool = activeAction?.tool ?? "analysis.think";
  const activeMeta = TOOL_META[activeTool] ?? TOOL_META["analysis.think"];

  const totalActions = actionItems.length;

  const stateItems = steps.filter((s) => s.type === "state");
  const resultItem = steps.find((s) => s.type === "result");

  return (
    <div data-testid="agent-thinking">
      <style>{STYLES}</style>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.022)",
          border: "1px solid rgba(124,141,255,0.16)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
          style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.05)" : "none" }}
          onClick={onToggleExpand}
          data-testid="button-toggle-action-feed"
        >
          {/* Animated emoji icon */}
          <span
            className={cn("text-[15px] leading-none flex-shrink-0", "aaf-pulse")}
          >
            {activeMeta.emoji}
          </span>

          {/* Label + dots */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span
              className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                background: `${activeMeta.color}14`,
                border: `1px solid ${activeMeta.color}30`,
                color: `${activeMeta.color}cc`,
              }}
            >
              {activeMeta.label}
            </span>
            <span className="text-[12px] font-semibold truncate" style={{ color: "rgba(226,232,240,0.9)" }}>
              Working{workingDots}
            </span>
          </div>

          {/* Count badge */}
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0"
            style={{
              background: "rgba(124,141,255,0.1)",
              border: "1px solid rgba(124,141,255,0.2)",
              color: "rgba(167,139,250,0.85)",
            }}
          >
            {Math.min(activeIdx + 1, totalActions)}/{totalActions} actions
          </span>

          {/* Chevron */}
          <ChevronDown
            className="h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200"
            style={{
              color: "rgba(148,163,184,0.35)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />

          {/* Stop */}
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium hover:opacity-80 transition-opacity flex-shrink-0"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "rgba(239,68,68,0.75)",
            }}
            data-testid="button-stop-agent"
          >
            <X className="h-2.5 w-2.5" />
            Stop
          </button>
        </div>

        {/* ── Expanded body ── */}
        {expanded && (
          <div className="py-1 flex flex-col gap-0.5">
            {/* Action items */}
            {actionItems.map((item, i) => {
              const status: ActionStatus =
                i < activeIdx ? "done" : i === activeIdx ? "running" : "pending";
              return (
                <ActionRow
                  key={i}
                  item={{ ...item, status }}
                  index={i}
                  total={actionItems.length}
                />
              );
            })}

            {/* State events — appear after last done action */}
            {stateItems.length > 0 && activeIdx >= totalActions - 1 && (
              <div className="flex flex-col gap-1 pt-1 pb-1 px-1">
                {stateItems.map((item, i) => (
                  <StateRow key={i} item={item} />
                ))}
              </div>
            )}

            {/* Result */}
            {resultItem && activeIdx >= totalActions - 1 && (
              <div
                className="aaf-row-in flex items-center gap-2 px-3 py-2 mx-1 mb-1 rounded-lg"
                style={{
                  background: "rgba(124,141,255,0.07)",
                  border: "1px solid rgba(124,141,255,0.18)",
                }}
              >
                <span className="text-[13px] leading-none">✅</span>
                <span className="text-[11px] font-semibold" style={{ color: "rgba(167,139,250,0.9)" }}>
                  {resultItem.content}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
