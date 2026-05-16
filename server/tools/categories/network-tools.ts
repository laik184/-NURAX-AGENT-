import type { Tool, ToolContext, ToolResult } from "../types.ts";

export const networkFetch: Tool = {
  name: "network_fetch",
  description: "Make an HTTP request from the server-side. Useful for calling external APIs, checking webhooks, or testing endpoints.",
  parameters: {
    type: "object",
    properties: {
      url:     { type: "string", description: "URL to request" },
      method:  { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], description: "HTTP method (default GET)" },
      headers: { type: "object", description: "Request headers (key-value pairs)" },
      body:    { type: "string", description: "Request body (JSON string for POST/PUT/PATCH)" },
      timeout: { type: "number", description: "Timeout in ms (default 10000)" },
    },
    required: ["url"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const url     = args.url as string;
    const method  = ((args.method as string) || "GET").toUpperCase();
    const timeout = (args.timeout as number) || 10_000;

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeout);
    if (ctx.signal) ctx.signal.addEventListener("abort", () => controller.abort());

    try {
      const fetchArgs: RequestInit = {
        method,
        headers: (args.headers as Record<string, string>) || {},
        signal: controller.signal,
        ...(args.body ? { body: args.body as string } : {}),
      };
      const res   = await fetch(url, fetchArgs);
      clearTimeout(timer);
      const text  = await res.text().catch(() => "");
      let body: unknown = text;
      try { body = JSON.parse(text); } catch { /* keep text */ }
      return { ok: res.ok, result: { status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers.entries()), body } };
    } catch (e: any) {
      clearTimeout(timer);
      if (e.name === "AbortError") return { ok: false, error: `Request timed out after ${timeout}ms` };
      return { ok: false, error: e.message };
    }
  },
};

export const networkPortCheck: Tool = {
  name: "network_port_check",
  description: "Check if a TCP port is open/listening on a host. Useful for verifying server startup or external dependencies.",
  parameters: {
    type: "object",
    properties: {
      host:    { type: "string", description: "Hostname to check (default: localhost)" },
      port:    { type: "number", description: "Port number to probe" },
      timeout: { type: "number", description: "Timeout in ms (default 3000)" },
    },
    required: ["port"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const host    = (args.host as string) || "localhost";
    const port    = args.port as number;
    const timeout = (args.timeout as number) || 3_000;

    const { createConnection } = await import("net");
    const start = Date.now();

    return new Promise((resolve) => {
      const socket = createConnection({ host, port, timeout });
      const timer  = setTimeout(() => {
        socket.destroy();
        resolve({ ok: false, result: { host, port, open: false, latencyMs: null, error: "timeout" } });
      }, timeout);
      socket.on("connect", () => {
        clearTimeout(timer);
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ ok: true, result: { host, port, open: true, latencyMs } });
      });
      socket.on("error", (e) => {
        clearTimeout(timer);
        resolve({ ok: false, result: { host, port, open: false, latencyMs: null, error: e.message } });
      });
    });
  },
};

export const networkDnsLookup: Tool = {
  name: "network_dns_lookup",
  description: "Perform a DNS lookup for a hostname. Returns IP address(es) and record type.",
  parameters: {
    type: "object",
    properties: {
      hostname: { type: "string", description: "Hostname to resolve" },
    },
    required: ["hostname"],
  },
  async run(args, _ctx: ToolContext): Promise<ToolResult> {
    const dns = await import("dns/promises");
    try {
      const addresses = await dns.resolve(args.hostname as string);
      return { ok: true, result: { hostname: args.hostname, addresses } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
