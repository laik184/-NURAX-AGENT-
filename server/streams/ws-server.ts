import type { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import chokidar from "chokidar";
import { bus } from "../events/bus.ts";
import { ensureProjectDir, projectRoot } from "../sandbox/sandbox.util.ts";
import { getExecSession } from "../routes/solo-pilot.routes.ts";

function safeSend(ws: WebSocket, payload: unknown): void {
  if (ws.readyState !== ws.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function attachWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;

    // Skip Vite HMR + Replit internal upgrades
    if (pathname.startsWith("/@vite/") || pathname.startsWith("/__vite") || pathname.startsWith("/__replco")) {
      return;
    }

    if (
      pathname === "/ws/terminal" ||
      pathname.startsWith("/ws/execute/") ||
      pathname.startsWith("/ws/agent/") ||
      pathname.startsWith("/ws/files/")
    ) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, pathname);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage, pathname: string) => {
    const url = new URL(req.url || "/", "http://localhost");
    const projectIdParam = url.searchParams.get("projectId");
    const projectId = projectIdParam ? Number(projectIdParam) : NaN;

    // /ws/terminal — interactive shell in sandbox
    if (pathname === "/ws/terminal") {
      handleTerminal(ws, Number.isFinite(projectId) ? projectId : null);
      return;
    }

    // /ws/execute/:sessionId — stream output of an existing solo-pilot exec
    if (pathname.startsWith("/ws/execute/")) {
      const sessionId = pathname.replace("/ws/execute/", "");
      handleExecute(ws, sessionId);
      return;
    }

    // /ws/agent/:runId — push AgentEvents for a specific run
    if (pathname.startsWith("/ws/agent/")) {
      const runId = pathname.replace("/ws/agent/", "");
      handleAgent(ws, runId);
      return;
    }

    // /ws/files/:projectId — fs change events
    if (pathname.startsWith("/ws/files/")) {
      const pid = Number(pathname.replace("/ws/files/", ""));
      if (Number.isFinite(pid)) handleFiles(ws, pid);
      else ws.close();
      return;
    }

    ws.close();
  });

  console.log("[nura-x] WebSocket server attached: /ws/{terminal,execute/:id,agent/:id,files/:id}");
}

async function handleTerminal(ws: WebSocket, projectId: number | null): Promise<void> {
  // SECURITY: refuse terminal without a valid projectId so we never spawn
  // bash in the host repo's process.cwd(). The terminal is sandbox-only.
  if (!projectId || !Number.isFinite(projectId) || projectId <= 0) {
    safeSend(ws, {
      type: "error",
      data: "projectId query parameter is required (e.g. /ws/terminal?projectId=1). Terminal sessions are sandbox-scoped.",
    });
    ws.close(1008, "projectId required");
    return;
  }
  await ensureProjectDir(projectId);
  const cwd = projectRoot(projectId);
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn("bash", ["-i"], {
      cwd,
      env: { ...process.env, TERM: "xterm-256color", PS1: "$ " },
    }) as ChildProcessWithoutNullStreams;
  } catch (e: any) {
    safeSend(ws, { type: "error", data: e.message });
    ws.close();
    return;
  }

  child.stdout.on("data", (chunk: Buffer) => safeSend(ws, { type: "stdout", data: chunk.toString() }));
  child.stderr.on("data", (chunk: Buffer) => safeSend(ws, { type: "stdout", data: chunk.toString() }));
  child.on("exit", (code) => {
    safeSend(ws, { type: "exit", data: code });
    ws.close();
  });

  ws.on("message", (msg) => {
    try {
      const parsed = JSON.parse(msg.toString()) as { type?: string; data?: string };
      if (parsed.type === "stdin" && typeof parsed.data === "string") {
        child.stdin.write(parsed.data);
      }
    } catch {
      // raw text fallback
      child.stdin.write(msg.toString());
    }
  });

  ws.on("close", () => child.kill());
  safeSend(ws, { type: "ready", data: { cwd } });
}

function handleExecute(ws: WebSocket, sessionId: string): void {
  const session = getExecSession(sessionId);
  if (!session) {
    safeSend(ws, { type: "error", data: `unknown session: ${sessionId}` });
    ws.close();
    return;
  }
  // Replay buffered output
  for (const line of session.output) safeSend(ws, { type: "stdout", data: line });

  const off = bus.on("console.log", (e) => {
    if (e.projectId !== session.projectId) return;
    safeSend(ws, { type: e.stream, data: e.line });
  });
  ws.on("close", off);
}

function handleAgent(ws: WebSocket, runId: string): void {
  const off = bus.on("agent.event", (e) => {
    if (e.runId !== runId) return;
    safeSend(ws, { type: "agent", data: e });
  });
  const offLife = bus.on("run.lifecycle", (e) => {
    if (e.runId !== runId) return;
    safeSend(ws, { type: "lifecycle", data: e });
  });
  safeSend(ws, { type: "ready", data: { runId } });
  ws.on("close", () => {
    off();
    offLife();
  });
}

async function handleFiles(ws: WebSocket, projectId: number): Promise<void> {
  await ensureProjectDir(projectId);
  const root = projectRoot(projectId);
  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
  });
  watcher.on("add", (p) => safeSend(ws, { type: "add", data: { path: p.replace(root + "/", "") } }));
  watcher.on("change", (p) => safeSend(ws, { type: "change", data: { path: p.replace(root + "/", "") } }));
  watcher.on("unlink", (p) => safeSend(ws, { type: "unlink", data: { path: p.replace(root + "/", "") } }));
  ws.on("close", () => watcher.close());
  safeSend(ws, { type: "ready", data: { projectId } });
}
