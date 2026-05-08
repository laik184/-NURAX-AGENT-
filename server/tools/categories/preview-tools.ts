import { projectRunner } from "../../services/project-runner.service.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import type { Tool } from "../types.ts";

export const previewUrl: Tool = {
  name: "preview_url",
  description:
    "Get the public preview URL for the running project. Use after server_start to share or verify the live URL. Returns the proxied URL path and the internal port.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx) {
    const meta = projectRunner.get(ctx.projectId);
    if (!meta || meta.status !== "running") {
      return { ok: false, error: "No server is running. Call server_start first." };
    }
    const previewPath = `/preview/${ctx.projectId}/`;
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "preview.url",
      phase: "tool",
      ts: Date.now(),
      payload: { previewPath, port: meta.port },
    });
    return { ok: true, result: { previewPath, port: meta.port, status: meta.status } };
  },
};

export const previewScreenshot: Tool = {
  name: "preview_screenshot",
  description:
    "Capture a screenshot of the running project preview. Returns the preview URL and emits a screenshot event the frontend renders inline. Requires the dev server to be running.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "URL path to navigate to before capture. Default '/'." },
    },
  },
  async run(args, ctx) {
    const meta = projectRunner.get(ctx.projectId);
    if (!meta || meta.status !== "running") {
      return { ok: false, error: "No server is running. Call server_start first, then preview_screenshot." };
    }

    const subPath    = typeof args.path === "string" ? args.path : "/";
    const previewPath = `/preview/${ctx.projectId}${subPath.startsWith("/") ? subPath : "/" + subPath}`;
    const port        = meta.port;

    // Try puppeteer (optional dep) for a real screenshot
    let base64: string | null = null;
    try {
      // Dynamic import — gracefully skip if not installed
      const puppeteer = await import("puppeteer").catch(() => null) as any;
      if (puppeteer) {
        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true });
        const page    = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(`http://localhost:${port}${subPath}`, { waitUntil: "networkidle0", timeout: 12_000 });
        const buffer = await page.screenshot({ type: "png" }) as Buffer;
        await browser.close();
        base64 = buffer.toString("base64");
      }
    } catch { /* puppeteer not available or page error — fall back to URL only */ }

    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "preview.screenshot",
      phase: "tool",
      ts: Date.now(),
      payload: { previewPath, port, base64, path: subPath },
    });

    return {
      ok: true,
      result: {
        previewPath,
        port,
        hasScreenshot: base64 !== null,
        note: base64 ? "Screenshot captured." : "Puppeteer not available — preview URL returned. Install puppeteer for real screenshots.",
      },
    };
  },
};

export const PREVIEW_TOOLS: readonly Tool[] = Object.freeze([previewUrl, previewScreenshot]);
