import { useState, useRef, useCallback } from "react";
import { getAgentMode } from "@/hooks/useAgentMode";
import type { AgentStreamItem } from "@/components/agent/AgentActionFeed";
import type { ChatMessage } from "./types";

export function useAgentRunner() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [activeAction, setActiveAction] = useState<AgentStreamItem | null>(null);

  const agentStreamRef    = useRef<EventSource | null>(null);
  const currentRunIdRef   = useRef<string | null>(null);
  const thinkingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const checkpointCountRef = useRef(0);

  const stopAgent = () => {
    thinkingTimersRef.current.forEach(clearTimeout);
    thinkingTimersRef.current = [];
    if (agentStreamRef.current) {
      try { agentStreamRef.current.close(); } catch { }
      agentStreamRef.current = null;
    }
    if (currentRunIdRef.current) {
      const rid = currentRunIdRef.current;
      currentRunIdRef.current = null;
      fetch(`/api/run/${rid}/cancel`, { method: "POST" }).catch(() => {});
    }
    setIsAgentThinking(false);
    setIsAgentTyping(false);
    setActiveAction(null);
  };

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
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "question" && m.question.questionId === questionId
          ? { ...m, question: { ...m.question, answered: answer } }
          : m,
      ),
    );
  }, []);

  const runAgent = async (msg: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const alreadyHas = prev.length > 0 && last.role === "user" && (last as { role: "user"; content: string; time: string }).content === msg;
      if (alreadyHas) return prev;
      return [...prev, { role: "user", content: msg, time: "just now" }];
    });
    setIsAgentThinking(true);
    setActiveAction({ type: "action", tool: "analysis.think", content: "Connecting to agent…", status: "running" });

    const projectId = Number(window.localStorage.getItem("nura.projectId") || "1") || 1;
    const mode = getAgentMode();

    let runId: string;
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-project-id": String(projectId) },
        body: JSON.stringify({ projectId, goal: msg, mode }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
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
    const es = new EventSource(`/api/agent/stream?runId=${encodeURIComponent(runId)}`);
    agentStreamRef.current = es;

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
        const e = JSON.parse((ev as MessageEvent).data) as { eventType: string; phase?: string; agentName?: string; payload?: any };
        switch (e.eventType) {
          case "agent.thinking":
            setIsAgentThinking(true);
            setActiveAction({ type: "action", tool: "analysis.think", content: e.payload?.text || `Thinking${e.agentName ? ` (${e.agentName})` : ""}…`, status: "running" });
            break;
          case "agent.tool_call": {
            const tool   = e.payload?.tool   || "tool.call";
            const status = e.payload?.status;
            // task_complete fires BEFORE the agent.message event — use it to show typing dots
            if (tool === "task_complete" && status === "running") {
              flushGroup();
              setIsAgentTyping(true);
              setIsAgentThinking(false);
              setActiveAction(null);
              break;
            }
            // "done"/"error" status updates are handled by the lifecycle handler — skip here
            if (status === "done" || status === "error") break;
            const item: AgentStreamItem = { type: "action", tool, content: e.payload?.label || tool.replace(/_/g, " "), status: "running", meta: e.payload?.args ? { logs: JSON.stringify(e.payload.args, null, 2).slice(0, 600) } : undefined };
            inflight.set(toolKey(tool, e.phase), item);
            setActiveAction(item);
            break;
          }
          case "phase.started": {
            const tool = `phase.${e.phase || "step"}`;
            const item: AgentStreamItem = { type: "action", tool, content: e.payload?.label || `Phase: ${e.phase || "step"}`, status: "running" };
            inflight.set(toolKey(tool), item);
            setActiveAction(item);
            break;
          }
          case "phase.completed": {
            const tool = `phase.${e.phase || "step"}`;
            const cur = inflight.get(toolKey(tool));
            if (cur) inflight.set(toolKey(tool), { ...cur, status: "done", meta: e.payload ? { logs: typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload, null, 2).slice(0, 600) } : cur.meta });
            setActiveAction(null);
            break;
          }
          case "phase.failed": {
            const tool = `phase.${e.phase || "step"}`;
            const cur = inflight.get(toolKey(tool));
            inflight.set(toolKey(tool), { type: "action", tool, content: cur?.content || `Phase ${e.phase || ""} failed`, status: "error", meta: { logs: String(e.payload?.error || "failed") } });
            setActiveAction(null);
            break;
          }
          case "file.written": {
            const path = e.payload?.path || "(file)";
            inflight.set(`file::${path}`, { type: "action", tool: "file_write", content: `Wrote ${path}`, status: "done", meta: { file: path } });
            break;
          }
          case "diff.queued": {
            const path = e.payload?.path || e.payload?.filePath || "(patch)";
            inflight.set(`diff::${path}::${Date.now()}`, { type: "action", tool: "patch.queue", content: `Queued patch for ${path}`, status: "done", meta: { file: path } });
            break;
          }
          case "file.diff": {
            if (inflight.size > 0) { const actions = Array.from(inflight.values()); inflight.clear(); setMessages((prev) => [...prev, { role: "tool_group", time: "just now", actions }]); }
            const diff = e.payload?.diff;
            if (diff) setMessages((prev) => [...prev, { role: "diff", diffs: [diff], time: "just now" }]);
            break;
          }
          case "agent.question": {
            flushGroup();
            setIsAgentThinking(false);
            setActiveAction(null);
            const { text, options, questionId } = e.payload ?? {};
            if (text && Array.isArray(options) && questionId)
              setMessages((prev) => [...prev, { role: "question" as const, time: "just now", question: { text, options, questionId, runId: currentRunIdRef.current ?? "" } }]);
            break;
          }
          case "agent.question.answered": {
            // Server confirmed the answer was received — mark question answered in UI.
            // Handles reconnect scenarios where local state was lost.
            const { questionId: answeredId, answer: confirmedAnswer } = e.payload ?? {};
            if (answeredId && confirmedAnswer) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.role === "question" && m.question.questionId === answeredId
                    ? { ...m, question: { ...m.question, answered: confirmedAnswer } }
                    : m,
                ),
              );
            }
            setIsAgentThinking(true);
            setActiveAction({ type: "action", tool: "analysis.think", content: "Processing answer…", status: "running" });
            break;
          }
          case "agent.message": {
            flushGroup();
            setIsAgentTyping(false);
            setActiveAction(null);
            const text = typeof e.payload === "string" ? e.payload : (e.payload?.text || JSON.stringify(e.payload));
            if (text) setMessages((prev) => [...prev, { role: "agent", content: text, time: "just now" }]);
            break;
          }
        }
      } catch { }
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
          const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const summary = e.status === "completed" ? `Done — finished **"${msg}"**.` : e.status === "cancelled" ? `Cancelled.` : `Run failed. Check the console for details.`;
          setMessages((prev) => [
            ...prev,
            { role: "agent", content: summary, time: "just now" },
            ...(e.status === "completed" ? [{ role: "checkpoint" as const, time: timeStr, checkpoint: { checkpointId: `cp-${Date.now()}`, label: msg.length > 60 ? msg.slice(0, 60) + "…" : msg, description: `After: ${msg.length > 40 ? msg.slice(0, 40) + "…" : msg}`, time: timeStr, filesChanged: 0 } }] : []),
          ]);
        }
      } catch { }
    });

    es.onerror = () => { if (es.readyState === EventSource.CLOSED) agentStreamRef.current = null; };
  };

  return { messages, setMessages, isAgentThinking, isAgentTyping, activeAction, setActiveAction, runAgent, stopAgent, handleAnswer };
}
