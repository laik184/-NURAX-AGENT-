import type { Tool, ToolContext, ToolResult } from "../types.ts";

export const apiCall: Tool = {
  name: "api_call",
  description: "Make an HTTP API request. Supports GET, POST, PUT, PATCH, DELETE. Returns status, headers, and body.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "Full URL to call" },
      method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method (default: GET)" },
      headers: { type: "object", description: "Request headers" },
      body: { type: "object", description: "Request body (for POST/PUT/PATCH)" },
      timeoutMs: { type: "number", description: "Timeout in ms (default 10000)" },
    },
    required: ["url"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const url = args.url as string;
    const method = ((args.method as string) || "GET").toUpperCase();
    const timeoutMs = (args.timeoutMs as number) || 10_000;
    const headers = (args.headers as Record<string, string>) || {};
    const body = args.body;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (ctx.signal) {
      ctx.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        signal: controller.signal,
      };

      if (body && !["GET", "HEAD"].includes(method)) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timer);

      const contentType = response.headers.get("content-type") || "";
      let responseBody: unknown;
      if (contentType.includes("application/json")) {
        responseBody = await response.json().catch(() => null);
      } else {
        const text = await response.text();
        responseBody = text.slice(0, 5000);
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { responseHeaders[k] = v; });

      return {
        ok: response.ok,
        result: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          url,
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (e: any) {
      clearTimeout(timer);
      return { ok: false, error: `Request failed: ${e.message}` };
    }
  },
};

export const searchWeb: Tool = {
  name: "search_web",
  description: "Search the web for information using DuckDuckGo or a configured search API.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      maxResults: { type: "number", description: "Max results to return (default 5)" },
    },
    required: ["query"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const query = args.query as string;
    const maxResults = (args.maxResults as number) || 5;
    const encoded = encodeURIComponent(query);

    try {
      const controller = new AbortController();
      ctx.signal?.addEventListener("abort", () => controller.abort());

      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
        { headers: { "User-Agent": "NURA-X/1.0" }, signal: controller.signal }
      );

      if (!response.ok) {
        return { ok: false, error: `Search API returned ${response.status}` };
      }

      const data = (await response.json()) as {
        Abstract?: string;
        AbstractText?: string;
        AbstractURL?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
        Results?: Array<{ Text?: string; FirstURL?: string }>;
      };

      const results: Array<{ title: string; url: string; snippet: string }> = [];

      if (data.AbstractText) {
        results.push({ title: data.Abstract || query, url: data.AbstractURL || "", snippet: data.AbstractText });
      }

      for (const topic of [...(data.RelatedTopics || []), ...(data.Results || [])]) {
        if (results.length >= maxResults) break;
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text.slice(0, 100), url: topic.FirstURL, snippet: topic.Text });
        }
      }

      return {
        ok: true,
        result: { query, count: results.length, results },
      };
    } catch (e: any) {
      return { ok: false, error: `Search failed: ${e.message}` };
    }
  },
};
